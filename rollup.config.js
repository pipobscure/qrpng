import noderesolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

const config = {
  input: "lib/qr.js",
  output: {
    name: "qrpng",
    file: "qr.js",
    format: "cjs",
    exports: "default",
  },
  plugins: [noderesolve(), commonjs()],
};

export default config;
