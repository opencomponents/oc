import { LJS } from './loader';
import { createOc } from './oc-client';

window.ljs = new LJS();
window.oc = createOc(window.oc || {});
