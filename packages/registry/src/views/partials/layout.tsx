import { Fragment } from '@kitajs/html';
import styleCSS from '../static/style';

interface LayoutProps {
  title: string;
  href: string;
  children: JSX.Element | JSX.Element[];
  scripts: string;
  theme: 'light' | 'dark';
  robots: boolean;
}

// const imgSrc = '/logo.png';
const Layout = ({
  title,
  href,
  children,
  scripts,
  theme,
  robots
}: LayoutProps) => {
  const normalizedHref = href
    .replace('http://', '//')
    .replace('https://', '//');

  const sunSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
  const moonSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';

  const themeIcon = theme === 'light' ? moonSvg : sunSvg;
  const themeText = theme === 'light' ? 'Switch to Dark' : 'Switch to Light';

  return (
    <Fragment>
      {'<!DOCTYPE html>'}
      <html lang="en" data-theme={theme}>
        <head>
          <title safe>{title}</title>
          <meta charset="UTF-8" />
          <meta
            name="robots"
            content={robots ? 'index, follow' : 'noindex, nofollow'}
          />
          <meta name="language" content="EN" />
          <meta name="distribution" content="global" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <style>{styleCSS}</style>
        </head>
        <body>
          <header class="header">
            <div class="container">
              <div class="header-content">
                <a class="logo" href={href}>
                  <div class="logo-icon">OC</div>
                  OpenComponents Registry
                </a>
                <button
                  class="theme-toggle"
                  id="theme-toggle"
                  type="button"
                  aria-label={`Switch to ${
                    theme === 'light' ? 'dark' : 'light'
                  } theme`}
                >
                  <span class="theme-toggle-icon" aria-hidden="true">
                    {themeIcon}
                  </span>
                  <span>{themeText}</span>
                </button>
              </div>
            </div>
          </header>

          <main class="container">{children}</main>

          <footer class="social container">
            <iframe
              id="gh_badge"
              title="GitHub"
              src="//ghbtns.com/github-btn.html?user=opencomponents&repo=oc&type=watch&count=true"
              width="110"
              height="20"
              frameborder="0"
            />
          </footer>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/1.11.2/jquery.min.js" />
          <script src={`${normalizedHref}oc-client/client.js`} />
          <script>{`
            // Theme switching functionality
            (function() {
              const sunSvg = ${JSON.stringify(sunSvg)};
              const moonSvg = ${JSON.stringify(moonSvg)};
              const themeToggle = document.getElementById('theme-toggle');
              const themeIcon = themeToggle.querySelector('.theme-toggle-icon');
              const themeText = themeToggle.querySelector('span:last-child');
              
              // Cookie helper functions
              function getCookie(name) {
                const value = "; " + document.cookie;
                const parts = value.split("; " + name + "=");
                if (parts.length === 2) return parts.pop().split(";").shift();
                return null;
              }
              
              function setCookie(name, value, days = 365) {
                const expires = new Date();
                expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
                document.cookie = name + "=" + value + ";expires=" + expires.toUTCString() + ";path=/";
              }
              
              // Get saved theme from cookie or default to current server-rendered theme
              const savedTheme = getCookie('oc-theme') || document.documentElement.getAttribute('data-theme') || 'dark';
              
              // Apply theme on load (only if different from server-rendered theme)
              function applyTheme(theme) {
                document.documentElement.setAttribute('data-theme', theme);
                if (theme === 'light') {
                  themeIcon.innerHTML = moonSvg;
                  themeText.textContent = 'Switch to Dark';
                } else {
                  themeIcon.innerHTML = sunSvg;
                  themeText.textContent = 'Switch to Light';
                }
              }
              
              // Initialize theme (only if different from server-rendered theme)
              const currentServerTheme = document.documentElement.getAttribute('data-theme');
              if (savedTheme !== currentServerTheme) {
                applyTheme(savedTheme);
              }
              
              // Toggle theme on button click
              themeToggle.addEventListener('click', function() {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                
                // Apply new theme
                applyTheme(newTheme);
                
                // Save to cookie
                setCookie('oc-theme', newTheme);
                
                // Add transition class for smooth switching
                document.body.style.transition = 'all 0.3s ease';
                setTimeout(() => {
                  document.body.style.transition = '';
                }, 300);
              });
            })();
          `}</script>
          <div>{scripts}</div>
        </body>
      </html>
    </Fragment>
  );
};

export default Layout;
