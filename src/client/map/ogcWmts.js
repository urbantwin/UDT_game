import L from 'leaflet'

// OGC WMTS defines a standardized physical pixel size of 0.28 mm.
// Resolution in map units/pixel = ScaleDenominator * 0.00028.
const OGC_PIXEL_SIZE = 0.00028

const toArray = (collection) => Array.from(collection ?? [])

const text = (node) => (node?.textContent ?? '').trim()

const firstDirectChildByName = (node, localName) =>
  toArray(node?.children).find((child) => child.localName === localName) ?? null

const directChildrenByName = (node, localName) =>
  toArray(node?.children).filter((child) => child.localName === localName)

const firstDirectTextByName = (node, localName) => text(firstDirectChildByName(node, localName))

const parseTopLeftCorner = (value) => {
  const [xRaw, yRaw] = value.split(/\s+/)
  const x = Number(xRaw)
  const y = Number(yRaw)

  if (Number.isNaN(x) || Number.isNaN(y)) {
    return [2420000, 1350000]
  }

  return [x, y]
}

export const parseCapabilitiesXml = (xmlText) => {
  const document = new DOMParser().parseFromString(xmlText, 'application/xml')
  const parserError = document.querySelector('parsererror')

  if (parserError) {
    throw new Error('Invalid WMTS capabilities XML.')
  }

  const contentsNode = document.getElementsByTagNameNS('*', 'Contents')[0]
  if (!contentsNode) {
    throw new Error('WMTS XML is missing a Contents node.')
  }

  const matrixSets = {}
  const matrixSetNodes = directChildrenByName(contentsNode, 'TileMatrixSet')

  for (const matrixSetNode of matrixSetNodes) {
    const identifier = firstDirectTextByName(matrixSetNode, 'Identifier')
    if (!identifier) continue

    const tileMatrices = directChildrenByName(matrixSetNode, 'TileMatrix')
      .map((tileMatrixNode) => {
        const matrixIdentifier = firstDirectTextByName(tileMatrixNode, 'Identifier')
        const scaleDenominator = Number(firstDirectTextByName(tileMatrixNode, 'ScaleDenominator'))
        const topLeftCorner = parseTopLeftCorner(firstDirectTextByName(tileMatrixNode, 'TopLeftCorner'))

        return {
          identifier: matrixIdentifier,
          topLeftCorner,
          resolution: scaleDenominator * OGC_PIXEL_SIZE,
        }
      })
      .filter((matrix) => matrix.identifier && Number.isFinite(matrix.resolution))

    matrixSets[identifier] = {
      identifier,
      supportedCrs: firstDirectTextByName(matrixSetNode, 'SupportedCRS'),
      tileMatrices,
    }
  }

  const layers = directChildrenByName(contentsNode, 'Layer').map((layerNode) => {
    const identifier = firstDirectTextByName(layerNode, 'Identifier')
    const title = firstDirectTextByName(layerNode, 'Title') || identifier
    const matrixSetId = firstDirectTextByName(firstDirectChildByName(layerNode, 'TileMatrixSetLink'), 'TileMatrixSet')
    const template = firstDirectChildByName(layerNode, 'ResourceURL')?.getAttribute('template') ?? ''

    const dimensions = {}
    for (const dimensionNode of directChildrenByName(layerNode, 'Dimension')) {
      const dimensionId = firstDirectTextByName(dimensionNode, 'Identifier')
      if (!dimensionId) continue

      dimensions[dimensionId] = {
        defaultValue: firstDirectTextByName(dimensionNode, 'Default'),
        values: directChildrenByName(dimensionNode, 'Value').map((valueNode) => text(valueNode)),
      }
    }

    return {
      identifier,
      title,
      matrixSetId,
      template,
      dimensions,
    }
  })

  return { layers: layers.filter((layer) => layer.identifier && layer.template), matrixSets }
}

const preferredLayerOrder = ['osm-wmts', 'ortho-wmts-ch', 'batiments']

export const pickDefaultLayer = (layers) => {
  for (const preferred of preferredLayerOrder) {
    const match = layers.find((layer) => layer.identifier === preferred)
    if (match) return match
  }

  return layers[0] ?? null
}

const withTemplateValue = (template, key, value) => template.replace(new RegExp(`\\{${key}\\}`, 'g'), value)

export const leafletWmtsUrl = (layer, selectedFloor) => {
  if (!layer) return ''

  const date = layer.dimensions.DATE?.defaultValue || layer.dimensions.DATE?.values?.[0] || '20201013'
  const floor = selectedFloor || layer.dimensions.floor?.defaultValue || layer.dimensions.floor?.values?.[0] || '99'

  let url = layer.template
  url = withTemplateValue(url, 'TileMatrixSet', layer.matrixSetId)
  url = withTemplateValue(url, 'TileMatrix', '{z}')
  url = withTemplateValue(url, 'TileRow', '{y}')
  url = withTemplateValue(url, 'TileCol', '{x}')
  url = withTemplateValue(url, 'DATE', date)
  url = withTemplateValue(url, 'floor', floor)

  return url
}

const interpolateResolution = (resolutions, zoom) => {
  if (!resolutions.length) return 1
  if (zoom <= 0) return resolutions[0] * (2 ** (-zoom))

  const maxIndex = resolutions.length - 1
  if (zoom >= maxIndex) return resolutions[maxIndex] / (2 ** (zoom - maxIndex))

  const low = Math.floor(zoom)
  const high = Math.ceil(zoom)
  if (low === high) return resolutions[low]

  const ratio = zoom - low
  return resolutions[low] + (resolutions[high] - resolutions[low]) * ratio
}

export const buildEpsg2056Crs = (matrixSet) => {
  if (!matrixSet?.tileMatrices?.length) {
    return {
      crs: L.CRS.Simple,
      minZoom: 0,
      maxZoom: 22,
      matrixIds: [],
    }
  }

  const resolutions = matrixSet.tileMatrices.map((matrix) => matrix.resolution)
  const matrixIds = matrixSet.tileMatrices.map((matrix) => matrix.identifier)
  const [originX, originY] = matrixSet.tileMatrices[0].topLeftCorner
  const maxZoom = resolutions.length - 1

  const crs = {
    ...L.CRS.Simple,
    projection: L.Projection.LonLat,
    transformation: new L.Transformation(1, -originX, -1, originY),
    infinite: true,
    scale: (zoom) => 1 / interpolateResolution(resolutions, zoom),
    zoom: (scale) => {
      const targetResolution = 1 / scale
      if (targetResolution <= resolutions[maxZoom]) {
        return maxZoom + Math.log2(resolutions[maxZoom] / targetResolution)
      }
      if (targetResolution >= resolutions[0]) {
        return Math.max(0, -Math.log2(targetResolution / resolutions[0]))
      }

      let bestIndex = 0
      let bestDistance = Number.POSITIVE_INFINITY

      for (let index = 0; index < resolutions.length; index += 1) {
        const distance = Math.abs(resolutions[index] - targetResolution)
        if (distance < bestDistance) {
          bestDistance = distance
          bestIndex = index
        }
      }

      return bestIndex
    },
  }

  return {
    crs,
    minZoom: 0,
    maxZoom,
    matrixIds,
  }
}
