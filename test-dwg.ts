
import dwg2dxf from "dwg2dxf";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function test() {
  try {
    // @ts-ignore
    const factory = dwg2dxf.default || dwg2dxf;
    console.log("Factory type:", typeof factory);
    
    const wasmPath = path.join(__dirname, "node_modules/dwg2dxf/dist/dwg2dxf-wasm.wasm");
    const wasmBinary = fs.readFileSync(wasmPath);
    console.log("Wasm binary loaded, size:", wasmBinary.length);

    const module = await factory({
      wasmBinary: wasmBinary,
      arguments: ['test.dwg', 'test.dxf']
    });
    console.log("Module initialized");
    console.log("_dwg2dxf exists:", typeof module._dwg2dxf);
    console.log("FS exists:", typeof module.FS);
    
    // Create a dummy a.dwg
    module.FS.writeFile('a.dwg', new Uint8Array([0, 0, 0, 0]));

    // Try to call it
    try {
      const result = module._dwg2dxf();
      console.log("Result of _dwg2dxf():", result);
      console.log("Files in FS:", module.FS.readdir('.'));
    } catch (e) {
      console.error("Error calling _dwg2dxf:", e);
    }
    
  } catch (e) {
    console.error("Initialization Error:", e);
  }
}

test();
