import { LJS } from "./loader";
import { createOc } from "./oc-client";

const oc = window.oc || {};
const ljs = new LJS();
window.ljs = ljs;

window.oc = createOc(oc);
