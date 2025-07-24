import { Fragment } from '@kitajs/html';
import styleCSS from '../static/style';

interface LayoutProps {
  title: string;
  href: string;
  children: JSX.Element | JSX.Element[];
  scripts: string;
}

const Layout = ({ title, href, children, scripts }: LayoutProps) => {
  const normalizedHref = href
    .replace('http://', '//')
    .replace('https://', '//');
  return (
    <Fragment>
      {'<!DOCTYPE html>'}
      <html lang="en">
        <head>
          <title>{title}</title>
          <meta name="robots" content="index, follow" />
          <meta name="language" content="EN" />
          <meta name="distribution" content="global" />
          <style>{styleCSS}</style>
        </head>
        <body>
          <a href={href}>
            <img src="logo.png" alt="OpenComponents Registry" />
          </a>
          <h1>OpenComponents Registry</h1>
          {children}
          <div class="social">
            <iframe
              id="gh_badge"
              title="GitHub"
              src="//ghbtns.com/github-btn.html?user=opencomponents&repo=oc&type=watch&count=true"
              width="110"
              height="20"
            />
          </div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/1.11.2/jquery.min.js" />
          <script src={`${normalizedHref}oc-client/client.js`} />
          {scripts}
        </body>
      </html>
    </Fragment>
  );
};

export default Layout;
