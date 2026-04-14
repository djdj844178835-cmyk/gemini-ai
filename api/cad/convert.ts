import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';
// @ts-ignore
import dwg2dxfFactory from 'dwg2dxf';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false, // 禁用默认解析器以处理文件上传
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: "解析表单失败" });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(400).json({ error: "未上传文件" });
    }

    const targetVersion = Array.isArray(fields.targetVersion) ? fields.targetVersion[0] : fields.targetVersion;
    const inputPath = file.filepath;

    try {
      const dwgData = fs.readFileSync(inputPath);
      
      // @ts-ignore
      const factory = dwg2dxfFactory.default || dwg2dxfFactory;
      
      // 在 Vercel 环境中，node_modules 路径可能不同
      const wasmPath = path.join(process.cwd(), "node_modules/dwg2dxf/dist/dwg2dxf-wasm.wasm");
      const wasmBinary = fs.readFileSync(wasmPath);

      const versionMap: Record<string, string> = {
        '2000': 'AC1015',
        '2004': 'AC1018',
        '2007': 'AC1021',
        '2010': 'AC1024',
        '2013': 'AC1027',
        '2018': 'AC1032',
        't3': 'AC1015'
      };

      const versionArg = versionMap[targetVersion as string] || 'AC1015';
      
      const module = await factory({
        wasmBinary: wasmBinary,
        arguments: ['-v', versionArg, 'input.dwg', 'output.dxf'],
      });
      
      const dwgUint8 = new Uint8Array(dwgData);
      module.FS.writeFile("input.dwg", dwgUint8);
      
      // @ts-ignore
      module._dwg2dxf(); 
      
      let outputName = "output.dxf";
      if (!module.FS.analyzePath(outputName).exists && module.FS.analyzePath("a.dxf").exists) {
        outputName = "a.dxf";
      }

      if (module.FS.analyzePath(outputName).exists) {
        let dxfData = module.FS.readFile(outputName);
        
        // 修复 EOF
        const dxfString = Buffer.from(dxfData).toString('utf-8');
        if (!dxfString.trim().endsWith('EOF')) {
          const fixedDxf = dxfString.trim() + '\n  0\nEOF\n';
          dxfData = Buffer.from(fixedDxf, 'utf-8');
        }

        res.setHeader("Content-Type", "application/dxf");
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent((file.originalFilename || "converted.dxf").replace(/\.dwg$/i, ".dxf"))}"`);
        res.send(Buffer.from(dxfData));
      } else {
        throw new Error("转换失败：未生成输出文件");
      }
    } catch (error: any) {
      console.error("[CAD Convert Error]", error);
      res.status(500).json({ error: `转换失败: ${error.message}` });
    }
  });
}
