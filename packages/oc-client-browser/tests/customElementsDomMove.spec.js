import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test.describe('oc-client : custom elements DOM moves', () => {
  test('should keep rendered component mounted when moved in the DOM', async ({
    page
  }) => {
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        let renderCalls = 0;
        let unmountCalls = 0;
        const originalRenderNested = oc.renderNestedComponent;

        oc.renderNestedComponent = (component, callback) => {
          if (component.getAttribute('data-rendered') !== 'true') {
            renderCalls++;
            component.setAttribute('data-rendered', 'true');
          }
          callback();
        };

        const container = document.createElement('div');
        const component1 = document.createElement('oc-component');
        const component2 = document.createElement('oc-component');

        component1.setAttribute('href', 'https://example.com/component-1');
        component2.setAttribute('href', 'https://example.com/component-2');
        component1.unmount = () => {
          unmountCalls++;
        };
        component2.unmount = () => {
          unmountCalls++;
        };

        container.appendChild(component1);
        container.appendChild(component2);
        document.body.appendChild(container);

        setTimeout(() => {
          container.insertBefore(component2, component1);

          setTimeout(() => {
            oc.renderNestedComponent = originalRenderNested;
            resolve({
              renderCalls,
              unmountCalls,
              firstHref: container.firstElementChild?.getAttribute('href'),
              component2Rendered:
                component2.getAttribute('data-rendered') === 'true'
            });
          }, 50);
        }, 50);
      });
    });

    expect(result.renderCalls).toBe(2);
    expect(result.unmountCalls).toBe(0);
    expect(result.firstHref).toBe('https://example.com/component-2');
    expect(result.component2Rendered).toBe(true);
  });
});
