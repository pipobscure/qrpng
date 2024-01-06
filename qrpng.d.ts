declare module "qrpng" {
  function generate(test: string, scale?: number): Uint8Array;
  export = generate;
}
