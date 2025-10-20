import type { Component, TemplateInfo } from '../../types';

export default function preview(vm: {
  href: string;
  fallbackClient?: string;
  component: Component;
  qs: string;
  liveReload: string;
  templates: TemplateInfo[];
  importmap?: {
    imports?: Record<string, string>;
  };
  preload?: string;
}): string {
  const baseUrl = vm.href.replace('http://', '//').replace('https://', '//');
  const { name, version } = vm.component;
  const imports = vm.importmap?.imports || vm.component.oc.files.imports;
  const componentHref = `${baseUrl}${name}/${version}/${vm.qs}`;
  const clientHref = vm.fallbackClient || `${baseUrl}oc-client/client.js`;
  const id = `oc-${name}@${version}`;

  return `<!DOCTYPE html>
  <html>
    <head>
      ${vm.preload ? `<script>${vm.preload}</script>` : ''}
      <style>
        html, body {
          width: 100%;
          height: 100%;
          margin: 0;
        }

        /* OC preview error overlay */
        .oc-error-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.92);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          z-index: 2147483647;
        }

        .oc-error-card {
          background: #0b0b0c;
          border: 1px solid #222;
          border-radius: 12px;
          color: #f5f5f5;
          max-width: 860px;
          width: 100%;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, Ubuntu, 'Helvetica Neue', Arial, sans-serif;
        }

        .oc-error-card__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #1e1e1e;
          background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,0));
        }

        .oc-error-title {
          font-size: 16px;
          font-weight: 600;
          color: #ffffff;
        }

        .oc-error-badge {
          font-size: 12px;
          background: #2b2b2d;
          color: #f9f9f9;
          border: 1px solid #3a3a3c;
          border-radius: 999px;
          padding: 4px 10px;
        }

        .oc-error-card__body {
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .oc-error-row {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .oc-error-key {
          min-width: 160px;
          color: #b3b3b3;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .oc-error-value {
          color: #e8e8e8;
          font-weight: 500;
        }

        .oc-error-message {
          margin-top: 4px;
          background: #151516;
          border: 1px solid #272729;
          border-radius: 8px;
          padding: 12px 14px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 13px;
          color: #f1d6d6;
        }

        .oc-error-hint {
          margin-top: 6px;
          color: #d0d0d0;
        }

        .oc-error-link {
          color: #8ab4ff;
          text-decoration: none;
        }
        .oc-error-link:hover { text-decoration: underline; }

        .oc-error-actions {
          display: flex;
          gap: 10px;
          padding: 14px 20px;
          border-top: 1px solid #1e1e1e;
          background: rgba(255,255,255,.02);
        }

        .oc-btn {
          appearance: none;
          border: 1px solid #2f2f31;
          background: #1c1c1f;
          color: #ffffff;
          font-weight: 600;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          cursor: pointer;
        }
        .oc-btn:hover { background: #232327; }
        .oc-btn--secondary { background: transparent; }
        .oc-btn--secondary:hover { background: #18181b; }
        .oc-btn--ghost { background: transparent; border-color: transparent; color: #bdbdbd; }
        .oc-btn--ghost:hover { background: #18181b; color: #ffffff; }

        .oc-error-details summary {
          cursor: pointer;
          color: #bdbdbd;
          margin: 6px 0;
        }
        .oc-error-pre {
          max-height: 280px;
          overflow: auto;
          background: #0f0f10;
          border: 1px solid #242426;
          border-radius: 8px;
          padding: 12px;
          color: #cfe3ff;
        }
      </style>
      <meta name="robots" content="index, follow" />
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      ${
        imports
          ? `<script type="importmap">{"imports": ${JSON.stringify(
              imports
            )}}</script>`
          : ''
      }
    </head>
    <body>
      <script src="${clientHref}"></script>

      <script>
        (function() {
          function byId(id){ return document.getElementById(id); }
          function escapeHtml(s){
            return String(s)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
          }
          function ensureOverlay(error) {
            if (document.getElementById('oc-error-overlay')) return;
            const element = byId('${id}');
            if (element && element.getAttribute('data-rendered') === 'true') return;

            const name = (error && (error.name || error.response?.name)) || '${name}';
            const requestVersion = (error && (error.requestVersion || error.response?.requestVersion)) || '${version}';
            const code = (error && (error.code || error.response?.code)) || 'UNKNOWN_ERROR';
            const message = (typeof (error && error.error) === 'string' && error.error) || (error && error.message) || (error && error.response && error.response.error) || 'An unexpected error occurred while rendering this component.';
            const status = (error && (error.status || error.response?.status)) || '';
            const missingPlugins = (error && (error.missingPlugins || error.response?.missingPlugins)) || [];
            const missingDependencies = (error && (error.missingDependencies || error.response?.missingDependencies)) || [];
            const detailsStack = (error && (error.details?.stack || error.response?.details?.stack)) || '';
            const frameStack = (error && (error.details?.frame || error.response?.details?.frame)) || '';

            var hintMap = {
              NOT_FOUND: 'The component or the requested version was not found on the registry.',
              NOT_VALID_REQUEST: 'The request is missing required or has invalid parameters.',
              PLUGIN_MISSING_FROM_REGISTRY: 'The registry is missing one or more required plugins.',
              DEPENDENCY_MISSING_FROM_REGISTRY: 'The component requires dependencies that are not available on this registry.',
              TEMPLATE_NOT_SUPPORTED: 'This registry does not support the requested template.',
              TEMPLATE_REQUIRES_HIGHER_OC_VERSION: 'This component requires a newer OC registry version.',
              DATA_RESOLVING_ERROR: 'The data provider could not be resolved.',
              ENV_RESOLVING_ERROR: 'The environment variables could not be resolved for this component.',
              INTERNAL_SERVER_ERROR: 'The component failed while executing.',
              GENERIC_ERROR: 'The component failed while executing.'
            };
            const hint = hintMap[code] || 'There was a problem rendering this component.';

            var overlay = document.createElement('div');
            overlay.id = 'oc-error-overlay';
            overlay.className = 'oc-error-overlay';
            var debugBlock = (detailsStack || frameStack)
              ? '<details class="oc-error-details" open><summary>Debug details</summary>' +
                (detailsStack ? '<pre class="oc-error-pre">' + escapeHtml(detailsStack) + '</pre>' : '') +
                (frameStack ? '<pre class="oc-error-pre">' + escapeHtml(frameStack) + '</pre>' : '') +
                '</details>'
              : '';

            overlay.innerHTML =
              '<div class="oc-error-card">' +
                '<div class="oc-error-card__header">' +
                  '<div class="oc-error-title">Failed to render component</div>' +
                  '<span class="oc-error-badge" title="Error code">' + code + '</span>' +
                '</div>' +
                '<div class="oc-error-card__body">' +
                  '<div class="oc-error-row"><span class="oc-error-key">Component</span><span class="oc-error-value">' + name + '</span></div>' +
                  '<div class="oc-error-row"><span class="oc-error-key">Requested version</span><span class="oc-error-value">' + (requestVersion || 'latest') + '</span></div>' +
                  '<div class="oc-error-row"><span class="oc-error-key">Component URL</span><a class="oc-error-link" href="${componentHref}" target="_blank" rel="noopener noreferrer">${componentHref}</a></div>' +
                  (status ? '<div class="oc-error-row"><span class="oc-error-key">HTTP status</span><span class="oc-error-value">' + status + '</span></div>' : '') +
                  '<div class="oc-error-hint">' + hint + '</div>' +
                  '<div class="oc-error-message">' + (message + '') + '</div>' +
                  (missingPlugins && missingPlugins.length ? '<div class="oc-error-row"><span class="oc-error-key">Missing plugins</span><span class="oc-error-value">' + missingPlugins.join(', ') + '</span></div>' : '') +
                  (missingDependencies && missingDependencies.length ? '<div class="oc-error-row"><span class="oc-error-key">Missing dependencies</span><span class="oc-error-value">' + missingDependencies.join(', ') + '</span></div>' : '') +
                  debugBlock +
                '</div>' +
                '<div class="oc-error-actions">' +
                  '<button class="oc-btn" id="oc-btn-retry">Retry</button>' +
                  '<button class="oc-btn oc-btn--secondary" id="oc-btn-dismiss">Dismiss</button>' +
                  (detailsStack ? '<button class="oc-btn oc-btn--ghost" id="oc-btn-copy">Copy stack</button>' : '') +
                '</div>' +
              '</div>';

            document.body.appendChild(overlay);

            var byIdLocal = function(x){ return document.getElementById(x); };
            var retryBtn = byIdLocal('oc-btn-retry');
            var dismissBtn = byIdLocal('oc-btn-dismiss');
            var copyBtn = byIdLocal('oc-btn-copy');

            if (retryBtn) retryBtn.addEventListener('click', function(){ window.location.reload(); });
            if (dismissBtn) dismissBtn.addEventListener('click', function(){ overlay.remove(); });
            if (copyBtn) copyBtn.addEventListener('click', function() {
              try {
                var text = String(detailsStack || '');
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(text);
                } else {
                  var ta = document.createElement('textarea');
                  ta.value = text;
                  document.body.appendChild(ta);
                  ta.select();
                  try { document.execCommand('copy'); } catch (e) {}
                  document.body.removeChild(ta);
                }
                copyBtn.textContent = 'Copied';
                setTimeout(function(){ copyBtn.textContent = 'Copy stack'; }, 1500);
              } catch (e) {}
            });
          }

          window.oc = window.oc || {};
          window.oc.cmd = window.oc.cmd || [];
          window.oc.cmd.push(function(oc) {
            oc.events.on('oc:error', function(ev, error) {
              ensureOverlay(error);
            });
          });

        })();
      </script>

      <oc-component id="${id}" href="${componentHref}"></oc-component>
      <script>window.oc=window.oc||{};oc.conf=oc.conf||{};oc.conf.templates=(oc.conf.templates||[]).concat(${JSON.stringify(
        vm.templates
      )});</script>
      ${vm.liveReload}
    </body>
  </html>`;
}
