import * as QRMath from "./math";

export class QRPolynomial {
  constructor(num: number[], shift: number) {
    if (num.length == undefined) {
      throw new Error(num.length + "/" + shift);
    }

    let offset = 0;
    while (offset < num.length && num[offset] == 0) {
      offset++;
    }

    this.num = new Array(num.length - offset + shift);
    for (var i = 0; i < num.length - offset; i++) {
      this.num[i] = num[i + offset];
    }
  }
  private num: number[];

  get length() {
    return this.num.length;
  }
  get(index: number): number {
    return this.num[index];
  }
  multiply(e: QRPolynomial): QRPolynomial {
    let num = new Array(this.length + e.length - 1);

    for (let i = 0; i < this.length; i++) {
      for (let j = 0; j < e.length; j++) {
        num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
      }
    }
    return new QRPolynomial(num, 0);
  }
  mod(e: QRPolynomial): QRPolynomial {
    if (this.length - e.length < 0) {
      return this;
    }

    let ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
    let num = new Array(this.length);

    for (let i = 0; i < this.length; i++) num[i] = this.get(i);
    for (let i = 0; i < e.length; i++) num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);

    // recursive call
    return new QRPolynomial(num, 0).mod(e);
  }
}
