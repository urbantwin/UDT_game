import { getAdminSubmissions, reviewSubmission } from '../services/admin-api.js';

// Dev admin gallery.
// This UI is intentionally simple and read-only for now.
// Next step: add validate/discard actions per submission item.
export function createAdminGalleryView({ container = document.body } = {}) {
  const root = document.createElement('div');
  root.style.position = 'fixed';
  root.style.right = '16px';
  root.style.bottom = '380px';
  root.style.zIndex = '1300';
  root.style.display = 'none';
  root.style.flexDirection = 'column';
  root.style.alignItems = 'flex-end';
  root.style.gap = '8px';

  const openButton = document.createElement('button');
  openButton.type = 'button';
  openButton.textContent = 'Admin Gallery';
  openButton.style.background = '#f59e0b';
  openButton.style.color = '#111827';
  openButton.style.border = 'none';
  openButton.style.borderRadius = '6px';
  openButton.style.padding = '6px 10px';
  openButton.style.cursor = 'pointer';
  openButton.style.font = '12px system-ui, sans-serif';
  root.appendChild(openButton);

  const panel = document.createElement('div');
  panel.style.display = 'none';
  panel.style.background = 'rgba(0, 0, 0, 0.82)';
  panel.style.color = '#ffffff';
  panel.style.padding = '10px';
  panel.style.borderRadius = '10px';
  panel.style.width = '340px';
  panel.style.maxHeight = '380px';
  panel.style.overflowY = 'auto';
  panel.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.35)';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.marginBottom = '8px';

  const title = document.createElement('div');
  title.textContent = 'All Player Submissions';
  title.style.fontWeight = '600';
  header.appendChild(title);

  const refreshButton = document.createElement('button');
  refreshButton.type = 'button';
  refreshButton.textContent = 'Refresh';
  refreshButton.style.background = '#60a5fa';
  refreshButton.style.color = '#111827';
  refreshButton.style.border = 'none';
  refreshButton.style.borderRadius = '6px';
  refreshButton.style.padding = '4px 8px';
  refreshButton.style.cursor = 'pointer';
  refreshButton.style.font = '11px system-ui, sans-serif';
  header.appendChild(refreshButton);

  panel.appendChild(header);

  const info = document.createElement('div');
  info.textContent = 'Pending items can be validated or discarded.';
  info.style.opacity = '0.8';
  info.style.fontSize = '11px';
  info.style.marginBottom = '8px';
  panel.appendChild(info);

  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = '8px';
  panel.appendChild(list);

  root.appendChild(panel);
  container.appendChild(root);

  openButton.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    if (panel.style.display === 'block') {
      refresh();
    }
  });

  refreshButton.addEventListener('click', () => {
    refresh();
  });

  async function refresh() {
    list.innerHTML = '';
    const loading = document.createElement('div');
    loading.textContent = 'Loading submissions...';
    loading.style.opacity = '0.8';
    list.appendChild(loading);

    try {
      const items = await getAdminSubmissions();
      list.innerHTML = '';
      if (!items.length) {
        const empty = document.createElement('div');
        empty.textContent = 'No submissions found.';
        empty.style.opacity = '0.8';
        list.appendChild(empty);
        return;
      }

      for (const item of items) {
        const row = document.createElement('div');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '56px 1fr auto';
        row.style.gap = '8px';
        row.style.alignItems = 'center';
        row.style.background = 'rgba(255, 255, 255, 0.06)';
        row.style.padding = '6px';
        row.style.borderRadius = '8px';

        const img = document.createElement('img');
        img.src = item.dataUrl;
        img.alt = 'Submitted photo';
        img.style.width = '56px';
        img.style.height = '56px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '6px';
        row.appendChild(img);

        const meta = document.createElement('div');
        meta.style.display = 'flex';
        meta.style.flexDirection = 'column';
        meta.style.gap = '2px';
        meta.style.fontSize = '11px';

        const author = document.createElement('div');
        author.textContent = `Player: ${item.submitterUsername ?? 'unknown'}`;
        const challenge = document.createElement('div');
        challenge.textContent = `Challenge: ${item.challengeDate ?? '-'} (${item.challengeLocationId ?? '-'})`;
        const status = document.createElement('div');
        status.textContent = `Review: ${item.reviewStatus ?? 'pending'}`;
        status.style.opacity = '0.85';
        status.style.textTransform = 'capitalize';
        const date = document.createElement('div');
        date.textContent = `Submitted: ${new Date(item.submittedAt).toLocaleString('en-GB', { hour12: false })}`;
        date.style.opacity = '0.75';

        const reviewedMeta = document.createElement('div');
        if (item.reviewedAt) {
          const reviewer = item.reviewedByUsername ?? `id ${item.reviewedBy ?? '-'}`;
          reviewedMeta.textContent = `Reviewed by ${reviewer} at ${new Date(item.reviewedAt).toLocaleString('en-GB', { hour12: false })}`;
          reviewedMeta.style.opacity = '0.7';
        } else {
          reviewedMeta.textContent = 'Not reviewed yet';
          reviewedMeta.style.opacity = '0.7';
        }

        meta.appendChild(author);
        meta.appendChild(challenge);
        meta.appendChild(status);
        meta.appendChild(date);
        meta.appendChild(reviewedMeta);
        row.appendChild(meta);

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.flexDirection = 'column';
        actions.style.gap = '4px';
        actions.style.alignItems = 'stretch';

        const pending = (item.reviewStatus ?? 'pending') === 'pending';
        if (pending) {
          const validateButton = makeActionButton('Validate', '#86efac');
          const discardButton = makeActionButton('Discard', '#fca5a5');
          const actionStatus = document.createElement('div');
          actionStatus.style.fontSize = '10px';
          actionStatus.style.opacity = '0.8';

          validateButton.addEventListener('click', async () => {
            await onReviewAction({
              submissionId: item.submissionId,
              action: 'validate',
              actionStatus,
              validateButton,
              discardButton
            });
          });

          discardButton.addEventListener('click', async () => {
            await onReviewAction({
              submissionId: item.submissionId,
              action: 'discard',
              actionStatus,
              validateButton,
              discardButton
            });
          });

          actions.appendChild(validateButton);
          actions.appendChild(discardButton);
          actions.appendChild(actionStatus);
        } else {
          const locked = document.createElement('div');
          locked.textContent = 'Reviewed';
          locked.style.fontSize = '11px';
          locked.style.opacity = '0.7';
          actions.appendChild(locked);
        }

        row.appendChild(actions);
        list.appendChild(row);
      }
    } catch (error) {
      list.innerHTML = '';
      const failed = document.createElement('div');
      failed.textContent = error.message || 'Failed to load.';
      failed.style.color = '#fca5a5';
      list.appendChild(failed);
    }
  }

  async function onReviewAction({
    submissionId,
    action,
    actionStatus,
    validateButton,
    discardButton
  }) {
    validateButton.disabled = true;
    discardButton.disabled = true;
    actionStatus.textContent = 'Saving...';
    try {
      await reviewSubmission({ submissionId, action });
      actionStatus.textContent = 'Saved';
      await refresh();
    } catch (error) {
      actionStatus.textContent = error.message || 'Failed';
      validateButton.disabled = false;
      discardButton.disabled = false;
    }
  }

  function setVisible(visible) {
    root.style.display = visible ? 'flex' : 'none';
    if (!visible) {
      panel.style.display = 'none';
    }
  }

  function remove() {
    root.remove();
  }

  return { setVisible, refresh, remove };
}

function makeActionButton(text, background) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = text;
  btn.style.background = background;
  btn.style.color = '#111827';
  btn.style.border = 'none';
  btn.style.borderRadius = '6px';
  btn.style.padding = '4px 8px';
  btn.style.cursor = 'pointer';
  btn.style.font = '11px system-ui, sans-serif';
  return btn;
}
