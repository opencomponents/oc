import { Fragment } from '@kitajs/html';
import styleCSS from '../static/style';

interface LayoutProps {
  title: string;
  href: string;
  children: JSX.Element | JSX.Element[];
  scripts: string;
  theme: 'light' | 'dark';
}

// const imgSrc = '/logo.png';
const Layout = ({ title, href, children, scripts, theme }: LayoutProps) => {
  const normalizedHref = href
    .replace('http://', '//')
    .replace('https://', '//');

  const themeIcon = theme === 'light' ? '🌙' : '☀️';
  const themeText = theme === 'light' ? 'Switch to Dark' : 'Switch to Light';

  return (
    <Fragment>
      {'<!DOCTYPE html>'}
      <html lang="en" data-theme={theme}>
        <head>
          <title safe>{title}</title>
          <meta charset="UTF-8" />
          <meta name="robots" content="index, follow" />
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

          <div class="social">
            <iframe
              id="gh_badge"
              title="GitHub"
              src="//ghbtns.com/github-btn.html?user=opencomponents&repo=oc&type=watch&count=true"
              width="110"
              height="20"
              frameborder="0"
            />
          </div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/1.11.2/jquery.min.js" />
          <script src={`${normalizedHref}oc-client/client.js`} />
          <script>{`
            // Theme switching functionality
            (function() {
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
                  themeIcon.textContent = '🌙';
                  themeText.textContent = 'Switch to Dark';
                } else {
                  themeIcon.textContent = '☀️';
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
