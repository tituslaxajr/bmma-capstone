export type ThreeModuleSet = {
  THREE: typeof import("three");
  EffectComposer: typeof import("three/addons/postprocessing/EffectComposer.js").EffectComposer;
  RenderPass: typeof import("three/addons/postprocessing/RenderPass.js").RenderPass;
  UnrealBloomPass: typeof import("three/addons/postprocessing/UnrealBloomPass.js").UnrealBloomPass;
  ShaderPass: typeof import("three/addons/postprocessing/ShaderPass.js").ShaderPass;
};

let cachedModules: Promise<ThreeModuleSet> | null = null;

export function loadThreeModules(): Promise<ThreeModuleSet> {
  if (!cachedModules) {
    cachedModules = Promise.all([
      import("three"),
      import("three/addons/postprocessing/EffectComposer.js"),
      import("three/addons/postprocessing/RenderPass.js"),
      import("three/addons/postprocessing/UnrealBloomPass.js"),
      import("three/addons/postprocessing/ShaderPass.js"),
    ]).then(([THREE, effectComposer, renderPass, unrealBloomPass, shaderPass]) => ({
      THREE,
      EffectComposer: effectComposer.EffectComposer,
      RenderPass: renderPass.RenderPass,
      UnrealBloomPass: unrealBloomPass.UnrealBloomPass,
      ShaderPass: shaderPass.ShaderPass,
    }));
  }

  return cachedModules;
}
