/**
 * Shared Three.js barrel export — prevents "Multiple instances of Three.js"
 * warning by ensuring every component imports from the same module entry point.
 *
 * Usage:  import { THREE, EffectComposer, RenderPass, ... } from "../lib/three-exports";
 */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

export { THREE, EffectComposer, RenderPass, UnrealBloomPass, ShaderPass };
