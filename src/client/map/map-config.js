// Configuration de la carte — campus EPFL.
// Utilise le serveur WMTS interne EPFL (plan intérieur avec étages).

// XML des capabilities WMTS embarqué statiquement.
// IMPORTANT : la déclaration <?xml doit être en toute première position,
// sans espace ni saut de ligne avant elle — DOMParser est strict là-dessus.
export const epflCapabilitiesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Capabilities version="1.0.0" xmlns="http://www.opengis.net/wmts/1.0" xmlns:ows="http://www.opengis.net/ows/1.1"
              xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
              xmlns:gml="http://www.opengis.net/gml"
              xsi:schemaLocation="http://schemas.opengis.net/wmts/1.0/wmtsGetCapabilities_response.xsd">
  <ows:ServiceIdentification> </ows:ServiceIdentification>
  <ows:ServiceProvider> </ows:ServiceProvider>
  <ows:OperationsMetadata>
    <ows:Operation name="GetCapabilities">
      <ows:DCP>
        <ows:HTTP>
          <ows:Get xlink:href="https://prod-plan-epfl-tiles0.epfl.ch/1.0.0/WMTSCapabilities_prod_2056.xml">
            <ows:Constraint name="GetEncoding">
              <ows:AllowedValues>
                <ows:Value>REST</ows:Value>
              </ows:AllowedValues>
            </ows:Constraint>
          </ows:Get>
        </ows:HTTP>
      </ows:DCP>
    </ows:Operation>
    <ows:Operation name="GetTile">
      <ows:DCP>
        <ows:HTTP>
          <ows:Get xlink:href="https://prod-plan-epfl-tiles0.epfl.ch/">
            <ows:Constraint name="GetEncoding">
              <ows:AllowedValues>
                <ows:Value>REST</ows:Value>
              </ows:AllowedValues>
            </ows:Constraint>
          </ows:Get>
          <ows:Get xlink:href="https://prod-plan-epfl-tiles1.epfl.ch/">
            <ows:Constraint name="GetEncoding">
              <ows:AllowedValues>
                <ows:Value>REST</ows:Value>
              </ows:AllowedValues>
            </ows:Constraint>
          </ows:Get>
          <ows:Get xlink:href="https://prod-plan-epfl-tiles2.epfl.ch/">
            <ows:Constraint name="GetEncoding">
              <ows:AllowedValues>
                <ows:Value>REST</ows:Value>
              </ows:AllowedValues>
            </ows:Constraint>
          </ows:Get>
          <ows:Get xlink:href="https://prod-plan-epfl-tiles3.epfl.ch/">
            <ows:Constraint name="GetEncoding">
              <ows:AllowedValues>
                <ows:Value>REST</ows:Value>
              </ows:AllowedValues>
            </ows:Constraint>
          </ows:Get>
          <ows:Get xlink:href="https://prod-plan-epfl-tiles4.epfl.ch/">
            <ows:Constraint name="GetEncoding">
              <ows:AllowedValues>
                <ows:Value>REST</ows:Value>
              </ows:AllowedValues>
            </ows:Constraint>
          </ows:Get>
        </ows:HTTP>
      </ows:DCP>
    </ows:Operation>
  </ows:OperationsMetadata>
  <!-- <ServiceMetadataURL xlink:href="" /> -->
  <Contents>
    
    <Layer>
      <ows:Title>batiments</ows:Title>
      <ows:Identifier>batiments</ows:Identifier>
      <Style isDefault="true">
        <ows:Identifier>default</ows:Identifier>
      </Style>
      <Format>image/png</Format> 
      <Dimension>
        <ows:Identifier>DATE</ows:Identifier>
        <Default>20231011</Default> 
        <Value>20160712</Value> 
        <Value>20201013</Value> 
        <Value>20231011</Value> 
      </Dimension>
      <Dimension>
        <ows:Identifier>floor</ows:Identifier>
        <Default>99</Default> 
        <Value>-4</Value> 
        <Value>-3</Value> 
        <Value>-2</Value> 
        <Value>-1</Value> 
        <Value>0</Value> 
        <Value>1</Value> 
        <Value>2</Value> 
        <Value>3</Value> 
        <Value>4</Value> 
        <Value>5</Value> 
        <Value>6</Value> 
        <Value>7</Value> 
        <Value>8</Value> 
        <Value>99</Value> 
      </Dimension>
      <ResourceURL format="image/png" resourceType="tile"
                   template="https://prod-plan-epfl-tiles0.epfl.ch/1.0.0/batiments/default/{DATE}/{floor}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png?1778625479" />
      <ResourceURL format="image/png" resourceType="tile"
                   template="https://prod-plan-epfl-tiles1.epfl.ch/1.0.0/batiments/default/{DATE}/{floor}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png?1778625479" />
      <ResourceURL format="image/png" resourceType="tile"
                   template="https://prod-plan-epfl-tiles2.epfl.ch/1.0.0/batiments/default/{DATE}/{floor}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png?1778625479" />
      <ResourceURL format="image/png" resourceType="tile"
                   template="https://prod-plan-epfl-tiles3.epfl.ch/1.0.0/batiments/default/{DATE}/{floor}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png?1778625479" />
      <ResourceURL format="image/png" resourceType="tile"
                   template="https://prod-plan-epfl-tiles4.epfl.ch/1.0.0/batiments/default/{DATE}/{floor}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png?1778625479" />
      <TileMatrixSetLink>
        <TileMatrixSet>2056</TileMatrixSet>
      </TileMatrixSetLink>
    </Layer>
    
    <Layer>
      <ows:Title>ortho-wmts-ch</ows:Title>
      <ows:Identifier>ortho-wmts-ch</ows:Identifier>
      <Style isDefault="true">
        <ows:Identifier>default</ows:Identifier>
      </Style>
      <Format>image/jpeg</Format> 
      <Dimension>
        <ows:Identifier>DATE</ows:Identifier>
        <Default>20201013</Default> 
        <Value>20180625</Value> 
        <Value>20201013</Value> 
        <Value>20230915</Value> 
      </Dimension>
      <ResourceURL format="image/jpeg" resourceType="tile"
                   template="https://prod-plan-epfl-tiles0.epfl.ch/1.0.0/ortho-wmts-ch/default/{DATE}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png?1778625479" />
      <ResourceURL format="image/jpeg" resourceType="tile"
                   template="https://prod-plan-epfl-tiles1.epfl.ch/1.0.0/ortho-wmts-ch/default/{DATE}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png?1778625479" />
      <ResourceURL format="image/jpeg" resourceType="tile"
                   template="https://prod-plan-epfl-tiles2.epfl.ch/1.0.0/ortho-wmts-ch/default/{DATE}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png?1778625479" />
      <ResourceURL format="image/jpeg" resourceType="tile"
                   template="https://prod-plan-epfl-tiles3.epfl.ch/1.0.0/ortho-wmts-ch/default/{DATE}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png?1778625479" />
      <ResourceURL format="image/jpeg" resourceType="tile"
                   template="https://prod-plan-epfl-tiles4.epfl.ch/1.0.0/ortho-wmts-ch/default/{DATE}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png?1778625479" />
      <TileMatrixSetLink>
        <TileMatrixSet>2056</TileMatrixSet>
      </TileMatrixSetLink>
    </Layer>
    
    <Layer>
      <ows:Title>osm-wmts</ows:Title>
      <ows:Identifier>osm-wmts</ows:Identifier>
      <Style isDefault="true">
        <ows:Identifier>default</ows:Identifier>
      </Style>
      <Format>image/png</Format> 
      <Dimension>
        <ows:Identifier>DATE</ows:Identifier>
        <Default>20201013</Default> 
        <Value>20141107</Value> 
        <Value>20180502</Value> 
        <Value>20200814</Value> 
        <Value>20201013</Value> 
        <Value>20220330</Value> 
        <Value>20220701</Value> 
        <Value>20230811</Value> 
        <Value>20250218</Value> 
      </Dimension>
      <ResourceURL format="image/png" resourceType="tile"
                   template="https://prod-plan-epfl-tiles0.epfl.ch/1.0.0/osm-wmts/default/{DATE}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png?1778625479" />
      <ResourceURL format="image/png" resourceType="tile"
                   template="https://prod-plan-epfl-tiles1.epfl.ch/1.0.0/osm-wmts/default/{DATE}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png?1778625479" />
      <ResourceURL format="image/png" resourceType="tile"
                   template="https://prod-plan-epfl-tiles2.epfl.ch/1.0.0/osm-wmts/default/{DATE}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png?1778625479" />
      <ResourceURL format="image/png" resourceType="tile"
                   template="https://prod-plan-epfl-tiles3.epfl.ch/1.0.0/osm-wmts/default/{DATE}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png?1778625479" />
      <ResourceURL format="image/png" resourceType="tile"
                   template="https://prod-plan-epfl-tiles4.epfl.ch/1.0.0/osm-wmts/default/{DATE}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png?1778625479" />
      <TileMatrixSetLink>
        <TileMatrixSet>2056</TileMatrixSet>
      </TileMatrixSetLink>
    </Layer>
    

    
    <TileMatrixSet>
      <ows:Identifier>2056</ows:Identifier>
      <ows:SupportedCRS>urn:ogc:def:crs:EPSG::2056</ows:SupportedCRS>
      <TileMatrix>
        <ows:Identifier>0</ows:Identifier>
        <ScaleDenominator>14285714.2857</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>1</ows:Identifier>
        <ScaleDenominator>13392857.1429</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>2</ows:Identifier>
        <ScaleDenominator>12500000.0</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>3</ows:Identifier>
        <ScaleDenominator>11607142.8571</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>4</ows:Identifier>
        <ScaleDenominator>10714285.7143</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>5</ows:Identifier>
        <ScaleDenominator>9821428.57143</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>6</ows:Identifier>
        <ScaleDenominator>8928571.42857</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>7</ows:Identifier>
        <ScaleDenominator>8035714.28571</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>8</ows:Identifier>
        <ScaleDenominator>7142857.14286</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>9</ows:Identifier>
        <ScaleDenominator>6250000.0</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>2</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>10</ows:Identifier>
        <ScaleDenominator>5357142.85714</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>2</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>11</ows:Identifier>
        <ScaleDenominator>4464285.71429</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>2</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>12</ows:Identifier>
        <ScaleDenominator>3571428.57143</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>2</MatrixWidth>
        <MatrixHeight>2</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>13</ows:Identifier>
        <ScaleDenominator>2678571.42857</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>3</MatrixWidth>
        <MatrixHeight>2</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>14</ows:Identifier>
        <ScaleDenominator>2321428.57143</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>3</MatrixWidth>
        <MatrixHeight>2</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>15</ows:Identifier>
        <ScaleDenominator>1785714.28571</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>4</MatrixWidth>
        <MatrixHeight>3</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>16</ows:Identifier>
        <ScaleDenominator>892857.142857</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>8</MatrixWidth>
        <MatrixHeight>5</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>17</ows:Identifier>
        <ScaleDenominator>357142.857143</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>19</MatrixWidth>
        <MatrixHeight>13</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>18</ows:Identifier>
        <ScaleDenominator>178571.428571</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>38</MatrixWidth>
        <MatrixHeight>25</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>19</ows:Identifier>
        <ScaleDenominator>71428.5714286</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>94</MatrixWidth>
        <MatrixHeight>63</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>20</ows:Identifier>
        <ScaleDenominator>35714.2857143</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>188</MatrixWidth>
        <MatrixHeight>125</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>21</ows:Identifier>
        <ScaleDenominator>17857.1428571</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>375</MatrixWidth>
        <MatrixHeight>250</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>22</ows:Identifier>
        <ScaleDenominator>8928.57142857</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>750</MatrixWidth>
        <MatrixHeight>500</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>23</ows:Identifier>
        <ScaleDenominator>7142.85714286</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>938</MatrixWidth>
        <MatrixHeight>625</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>24</ows:Identifier>
        <ScaleDenominator>5357.14285714</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1250</MatrixWidth>
        <MatrixHeight>834</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>25</ows:Identifier>
        <ScaleDenominator>3571.42857143</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1875</MatrixWidth>
        <MatrixHeight>1250</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>26</ows:Identifier>
        <ScaleDenominator>1785.71428571</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>3750</MatrixWidth>
        <MatrixHeight>2500</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>27</ows:Identifier>
        <ScaleDenominator>892.857142857</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>7500</MatrixWidth>
        <MatrixHeight>5000</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>28</ows:Identifier>
        <ScaleDenominator>357.142857143</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>18750</MatrixWidth>
        <MatrixHeight>12500</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>29</ows:Identifier>
        <ScaleDenominator>178.571428571</ScaleDenominator>
        <TopLeftCorner>2420000 1350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>37500</MatrixWidth>
        <MatrixHeight>25000</MatrixHeight>
      </TileMatrix>
      
    </TileMatrixSet>
    
    <TileMatrixSet>
      <ows:Identifier>21781</ows:Identifier>
      <ows:SupportedCRS>urn:ogc:def:crs:EPSG::21781</ows:SupportedCRS>
      <TileMatrix>
        <ows:Identifier>0</ows:Identifier>
        <ScaleDenominator>14285714.2857</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>1</ows:Identifier>
        <ScaleDenominator>13392857.1429</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>2</ows:Identifier>
        <ScaleDenominator>12500000.0</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>3</ows:Identifier>
        <ScaleDenominator>11607142.8571</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>4</ows:Identifier>
        <ScaleDenominator>10714285.7143</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>5</ows:Identifier>
        <ScaleDenominator>9821428.57143</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>6</ows:Identifier>
        <ScaleDenominator>8928571.42857</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>7</ows:Identifier>
        <ScaleDenominator>8035714.28571</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>8</ows:Identifier>
        <ScaleDenominator>7142857.14286</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>9</ows:Identifier>
        <ScaleDenominator>6250000.0</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>2</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>10</ows:Identifier>
        <ScaleDenominator>5357142.85714</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>2</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>11</ows:Identifier>
        <ScaleDenominator>4464285.71429</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>2</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>12</ows:Identifier>
        <ScaleDenominator>3571428.57143</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>2</MatrixWidth>
        <MatrixHeight>2</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>13</ows:Identifier>
        <ScaleDenominator>2678571.42857</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>3</MatrixWidth>
        <MatrixHeight>2</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>14</ows:Identifier>
        <ScaleDenominator>2321428.57143</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>3</MatrixWidth>
        <MatrixHeight>2</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>15</ows:Identifier>
        <ScaleDenominator>1785714.28571</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>4</MatrixWidth>
        <MatrixHeight>3</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>16</ows:Identifier>
        <ScaleDenominator>892857.142857</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>8</MatrixWidth>
        <MatrixHeight>5</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>17</ows:Identifier>
        <ScaleDenominator>357142.857143</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>19</MatrixWidth>
        <MatrixHeight>13</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>18</ows:Identifier>
        <ScaleDenominator>178571.428571</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>38</MatrixWidth>
        <MatrixHeight>25</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>19</ows:Identifier>
        <ScaleDenominator>71428.5714286</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>94</MatrixWidth>
        <MatrixHeight>63</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>20</ows:Identifier>
        <ScaleDenominator>35714.2857143</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>188</MatrixWidth>
        <MatrixHeight>125</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>21</ows:Identifier>
        <ScaleDenominator>17857.1428571</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>375</MatrixWidth>
        <MatrixHeight>250</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>22</ows:Identifier>
        <ScaleDenominator>8928.57142857</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>750</MatrixWidth>
        <MatrixHeight>500</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>23</ows:Identifier>
        <ScaleDenominator>7142.85714286</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>938</MatrixWidth>
        <MatrixHeight>625</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>24</ows:Identifier>
        <ScaleDenominator>5357.14285714</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1250</MatrixWidth>
        <MatrixHeight>834</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>25</ows:Identifier>
        <ScaleDenominator>3571.42857143</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1875</MatrixWidth>
        <MatrixHeight>1250</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>26</ows:Identifier>
        <ScaleDenominator>1785.71428571</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>3750</MatrixWidth>
        <MatrixHeight>2500</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>27</ows:Identifier>
        <ScaleDenominator>892.857142857</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>7500</MatrixWidth>
        <MatrixHeight>5000</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>28</ows:Identifier>
        <ScaleDenominator>357.142857143</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>18750</MatrixWidth>
        <MatrixHeight>12500</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>29</ows:Identifier>
        <ScaleDenominator>178.571428571</ScaleDenominator>
        <TopLeftCorner>420000 350000</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>37500</MatrixWidth>
        <MatrixHeight>25000</MatrixHeight>
      </TileMatrix>
      
    </TileMatrixSet>
    
    <TileMatrixSet>
      <ows:Identifier>grid-ch</ows:Identifier>
      <ows:SupportedCRS>urn:ogc:def:crs:EPSG::21781</ows:SupportedCRS>
      <TileMatrix>
        <ows:Identifier>0</ows:Identifier>
        <ScaleDenominator>559082263.929</ScaleDenominator>
        <TopLeftCorner>485869.5728 299941.7864</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>1</ows:Identifier>
        <ScaleDenominator>279541131.964</ScaleDenominator>
        <TopLeftCorner>485869.5728 299941.7864</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>2</ows:Identifier>
        <ScaleDenominator>139770565.982</ScaleDenominator>
        <TopLeftCorner>485869.5728 299941.7864</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>3</ows:Identifier>
        <ScaleDenominator>69885282.9911</ScaleDenominator>
        <TopLeftCorner>485869.5728 299941.7864</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>4</ows:Identifier>
        <ScaleDenominator>34942641.4955</ScaleDenominator>
        <TopLeftCorner>485869.5728 299941.7864</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>5</ows:Identifier>
        <ScaleDenominator>17471320.7478</ScaleDenominator>
        <TopLeftCorner>485869.5728 299941.7864</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>6</ows:Identifier>
        <ScaleDenominator>8735660.37388</ScaleDenominator>
        <TopLeftCorner>485869.5728 299941.7864</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>7</ows:Identifier>
        <ScaleDenominator>4367830.18694</ScaleDenominator>
        <TopLeftCorner>485869.5728 299941.7864</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>2</MatrixWidth>
        <MatrixHeight>1</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>8</ows:Identifier>
        <ScaleDenominator>2183915.09347</ScaleDenominator>
        <TopLeftCorner>485869.5728 299941.7864</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>3</MatrixWidth>
        <MatrixHeight>2</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>9</ows:Identifier>
        <ScaleDenominator>1091957.54674</ScaleDenominator>
        <TopLeftCorner>485869.5728 299941.7864</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>5</MatrixWidth>
        <MatrixHeight>3</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>10</ows:Identifier>
        <ScaleDenominator>545978.773368</ScaleDenominator>
        <TopLeftCorner>485869.5728 299941.7864</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>9</MatrixWidth>
        <MatrixHeight>6</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>11</ows:Identifier>
        <ScaleDenominator>272989.386684</ScaleDenominator>
        <TopLeftCorner>485869.5728 299941.7864</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>18</MatrixWidth>
        <MatrixHeight>12</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>12</ows:Identifier>
        <ScaleDenominator>136494.693342</ScaleDenominator>
        <TopLeftCorner>485869.5728 299941.7864</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>36</MatrixWidth>
        <MatrixHeight>23</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>13</ows:Identifier>
        <ScaleDenominator>68247.346671</ScaleDenominator>
        <TopLeftCorner>485869.5728 299941.7864</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>72</MatrixWidth>
        <MatrixHeight>46</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>14</ows:Identifier>
        <ScaleDenominator>34123.6733355</ScaleDenominator>
        <TopLeftCorner>485869.5728 299941.7864</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>144</MatrixWidth>
        <MatrixHeight>92</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>15</ows:Identifier>
        <ScaleDenominator>17061.8366677</ScaleDenominator>
        <TopLeftCorner>485869.5728 299941.7864</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>288</MatrixWidth>
        <MatrixHeight>183</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>16</ows:Identifier>
        <ScaleDenominator>8530.91833387</ScaleDenominator>
        <TopLeftCorner>485869.5728 299941.7864</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>575</MatrixWidth>
        <MatrixHeight>366</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>17</ows:Identifier>
        <ScaleDenominator>4265.45916694</ScaleDenominator>
        <TopLeftCorner>485869.5728 299941.7864</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>1149</MatrixWidth>
        <MatrixHeight>731</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>18</ows:Identifier>
        <ScaleDenominator>2132.72958347</ScaleDenominator>
        <TopLeftCorner>485869.5728 299941.7864</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>2298</MatrixWidth>
        <MatrixHeight>1462</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>19</ows:Identifier>
        <ScaleDenominator>1066.36479173</ScaleDenominator>
        <TopLeftCorner>485869.5728 299941.7864</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>4595</MatrixWidth>
        <MatrixHeight>2924</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>20</ows:Identifier>
        <ScaleDenominator>533.182395867</ScaleDenominator>
        <TopLeftCorner>485869.5728 299941.7864</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>9190</MatrixWidth>
        <MatrixHeight>5848</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>21</ows:Identifier>
        <ScaleDenominator>266.591197933</ScaleDenominator>
        <TopLeftCorner>485869.5728 299941.7864</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>18379</MatrixWidth>
        <MatrixHeight>11696</MatrixHeight>
      </TileMatrix>
      
      <TileMatrix>
        <ows:Identifier>22</ows:Identifier>
        <ScaleDenominator>133.295598967</ScaleDenominator>
        <TopLeftCorner>485869.5728 299941.7864</TopLeftCorner>
        <TileWidth>256</TileWidth>
        <TileHeight>256</TileHeight>
        <MatrixWidth>36758</MatrixWidth>
        <MatrixHeight>23392</MatrixHeight>
      </TileMatrix>
      
    </TileMatrixSet>
    
  </Contents>
</Capabilities>
`;

export const mapConfig = {
  // Centre du campus EPFL (Rolex Learning Center)
  center: { lat: 46.520444, lon: 6.567812 },

  // Zoom initial : 17 = vue campus complet, 19 = détail bâtiment
  initialZoom: 17,
  minZoom: 16,
  maxZoom: 19,

  attribution: '© <a href="https://www.epfl.ch">EPFL</a>',

  maxBounds: [
    [46.514899, 6.559748], // Sud-Ouest
    [46.525309, 6.575161]  // Nord-Est
  ],
  maxBoundsViscosity: 0.9,

  // 99 = vue extérieure/toits, 0 = rez-de-chaussée
  defaultFloor: 99,
};