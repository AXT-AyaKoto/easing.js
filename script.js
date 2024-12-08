/** ================================================================================================
 * AXT-AyaKoto/easing.js
 * copyright (c) 2024- Ayasaka-Koto, All rights reserved.
================================================================================================= */

/** ================================================================================================
 * ベジェ曲線に関する計算に複素数が登場するので、必要な複素数演算を定義
================================================================================================= */

/**
 * @typedef Complex - 複素数
 * @property {number} real - 実部
 * @property {number} imag - 虚部
 */
const Complex = class Complex {
    /**
     * @param {number} real 
     * @param {number} imag 
     */
    constructor(real, imag) {
        this.real = real;
        this.imag = imag;
    }
    /**
     * x + y
     * @param {number|Complex} x 
     * @param {number|Complex} y 
     * @returns {Complex}
     */
    static add(x, y) {
        if (typeof x === "number") x = new Complex(x, 0);
        if (typeof y === "number") y = new Complex(y, 0);
        return new Complex(x.real + y.real, x.imag + y.imag);
    }
    /**
     * x - y
     * @param {number|Complex} x 
     * @param {number|Complex} y 
     * @returns {Complex}
     */
    static sub(x, y) {
        if (typeof x === "number") x = new Complex(x, 0);
        if (typeof y === "number") y = new Complex(y, 0);
        return new Complex(x.real - y.real, x.imag - y.imag);
    }
    /**
     * x * y
     * @param {number|Complex} x 
     * @param {number|Complex} y 
     * @returns {Complex}
     */
    static mul(x, y) {
        if (typeof x === "number") x = new Complex(x, 0);
        if (typeof y === "number") y = new Complex(y, 0);
        return new Complex(x.real * y.real - x.imag * y.imag, x.real * y.imag + x.imag * y.real);
    }
    /**
     * x / y
     * @param {number|Complex} x 
     * @param {number|Complex} y 
     * @returns {Complex}
     */
    static div(x, y) {
        if (typeof x === "number") x = new Complex(x, 0);
        if (typeof y === "number") y = new Complex(y, 0);
        const denominator = y.real ** 2 + y.imag ** 2;
        return new Complex(
            (x.real * y.real + x.imag * y.imag) / denominator,
            (x.imag * y.real - x.real * y.imag) / denominator
        );
    }
    /**
     * x^y
     * @param {number|Complex} x 
     * @param {number|Complex} y 
     * @returns {Complex}
     */
    static pow(x, y) {
        if (typeof x === "number") x = new Complex(x, 0);
        if (typeof y === "number") y = new Complex(y, 0);
        const { real: a, imag: b } = x;
        const { real: c, imag: d } = y;

        // x^0 の場合は 1 で早期return
        if (c === 0 && d === 0) return new Complex(1, 0);
        // 0^y の場合は 0 で早期return
        if (a === 0 && b === 0) return new Complex(0, 0);

        // 極形式への変換
        const r = Math.sqrt(a * a + b * b);
        const theta = Math.atan2(b, a);

        // 対数の計算（ln(r) + iθ）
        const logR = Math.log(r);
        const logBase = { real: logR, imag: theta };

        // 指数 w * ln(base) の計算
        const mulReal = logBase.real * c - logBase.imag * d;
        const mulImag = logBase.real * d + logBase.imag * c;

        // 指数の結果を e^(w * ln(base)) に変換
        const expMagnitude = Math.exp(mulReal);
        const resultReal = expMagnitude * Math.cos(mulImag);
        const resultImag = expMagnitude * Math.sin(mulImag);

        return new Complex(resultReal, resultImag);
    }
    /**
     * sqrt(x)
     * @param {number|Complex} x
     * @returns {Complex}
     */
    static sqrt(x) {
        if (typeof x === "number") x = new Complex(x, 0);
        if (typeof y === "number") y = new Complex(y, 0);
        return Complex.pow(x, new Complex(1 / 2, 0));
    }
    /**
     * cbrt(x)
     * @param {number|Complex} x
     * @returns {Complex}
     */
    static cbrt(x) {
        if (typeof x === "number") x = new Complex(x, 0);
        if (typeof y === "number") y = new Complex(y, 0);
        return Complex.pow(x, new Complex(1 / 3, 0));
    }
    /**
     * 実部と虚部をそれぞれ小数点以下n桁で四捨五入
     * @param {Complex} x - 四捨五入する数
     * @param {number} [n=4] - 小数点以下桁数
     * @returns {Complex}
     */
    static round(x, n = 4) {
        const factor = 10 ** n;
        const real = Math.round(x.real * factor) / factor;
        const imag = Math.round(x.imag * factor) / factor;
        return new Complex(real, imag);
    }
};

/**
 * カルダノの方法を用いて、3次方程式の解を求める
 * @param {number} a 
 * @param {number} b 
 * @param {number} c 
 * @param {number} d 
 * @returns {Complex[]}
 */
const cardano = (a, b, c, d) => {
    /** a = 0 の場合はエラー */
    if (a === 0) throw new Error("Argument 'a' must not be zero.");
    /** 係数の正規化 */
    const [b_, c_, d_] = [b / a, c / a, d / a];
    /** pとqを求める */
    const p = (3 * c_ - b_ ** 2) / 3;
    const q = (2 * b_ ** 3 - 9 * b_ * c_ + 27 * d_) / 27;
    /** uとvを求める */
    const minus_q_over_2 = -q / 2;
    const sqrt_operand = (q / 2) ** 2 + (p / 3) ** 3;
    const u_cbrt_operand = Complex.add(minus_q_over_2, Complex.sqrt(sqrt_operand));
    const v_cbrt_operand = Complex.sub(minus_q_over_2, Complex.sqrt(sqrt_operand));
    const u = Complex.cbrt(u_cbrt_operand);
    const v = Complex.cbrt(v_cbrt_operand);
    /** 3つの解を計算 */
    // x1 = u + v - b / 3
    const x1 = Complex.sub(Complex.add(u, v), b / 3);
    // x2・x3で使う中間変数
    const minus_u_plus_v_over_2 = Complex.div(Complex.mul(Complex.add(u, v), -1), 2);
    const b_over_3 = b / 3;
    const sqrt_3 = Math.sqrt(3);
    const u_minus_v_over_2 = Complex.div(Complex.sub(u, v), 2);
    const I = new Complex(0, 1);
    // x2
    const x2 = Complex.add(Complex.sub(minus_u_plus_v_over_2, b_over_3), Complex.mul(Complex.mul(sqrt_3, u_minus_v_over_2), I));
    // x3
    const x3 = Complex.sub(Complex.sub(minus_u_plus_v_over_2, b_over_3), Complex.mul(Complex.mul(sqrt_3, u_minus_v_over_2), I));
    console.log(x1, x2, x3);
    // return
    return [x1, x2, x3].map(n => Complex.round(n, 2));
};

/** ================================================================================================
 * 名前付きイージング関数のリストを作る
================================================================================================= */

/** @type {string[]} - 名前付きイージングに対応する関数の種類 */
const easingTypes = ["Linear", "Sine", "Quad", "Cubic", "Quart", "Quint", "Expo", "Circ", "Back"];
/** @type {string[]} - 名前付きイージングに対応する方向の種類 */
const easingDirs = ["In", "Out", "InOut", "OutIn"];
/** @type {string[]} - 名前付きイージングの種類一覧 */
const easingNames = easingTypes.flatMap(type => easingDirs.map(dir => `${type}_${dir}`));

/** @type {Object<string, [number, number, number, number]>} - 方向がInの名前付きイージングの制御点の値 */
const ctrlPt_In = {
    "Linear": [0.40, 0.40, 0.60, 0.60],
    "Sine": [0.12, 0.00, 0.39, 0.00],
    "Quad": [0.11, 0.00, 0.50, 0.00],
    "Cubic": [0.32, 0.00, 0.67, 0.00],
    "Quart": [0.50, 0.00, 0.75, 0.00],
    "Quint": [0.64, 0.00, 0.78, 0.00],
    "Expo": [0.70, 0.00, 0.84, 0.00],
    "Circ": [0.55, 0.00, 1.00, 0.45],
    "Back": [0.36, 0.00, 0.66, -0.56]
};
/** @type {Object<string, [number, number, number, number]>} - 方向がOutの名前付きイージングの制御点の値 */
const ctrlPt_Out = (() => {
    // Inを[x1, y1, x2, y2]とすると、Outは[1-x2, 1-y2, 1-x1, 1-y1]で計算できる
    const returnObj = {};
    easingTypes.forEach(type => {
        const In_pts = ctrlPt_In[type];
        returnObj[type] = [1 - In_pts[2], 1 - In_pts[3], 1 - In_pts[0], 1 - In_pts[1]];
    });
    return returnObj;
})();
/** @type {Object<string, [number, number, number, number]>} - 方向がInOutの名前付きイージングの制御点の値 */
const ctrlPt_InOut = {
    "Linear": [0.40, 0.40, 0.60, 0.60],
    "Sine": [0.37, 0.00, 0.63, 1.00],
    "Quad": [0.45, 0.00, 0.55, 1.00],
    "Cubic": [0.65, 0.00, 0.35, 1.00],
    "Quart": [0.76, 0.00, 0.24, 1.00],
    "Quint": [0.83, 0.00, 0.17, 1.00],
    "Expo": [0.87, 0.00, 0.13, 1.00],
    "Circ": [0.85, 0.00, 0.15, 1.00],
    "Back": [0.68, -0.60, 0.32, 1.60]
};
/** @type {Object<string, [number, number, number, number]>} - 方向がOutInの名前付きイージングの制御点の値 */
const ctrlPt_OutIn = (() => {
    // InOutを[x1, y1, x2, y2]とすると、OutInは[y1, x1, y2, x2]で計算できる
    const returnObj = {};
    easingTypes.forEach(type => {
        const InOut_pts = ctrlPt_InOut[type];
        returnObj[type] = [InOut_pts[1], InOut_pts[0], InOut_pts[3], InOut_pts[2]];
    });
    return returnObj;
})();
/** @type {Object<string, [number, number, number, number]>} - 名前付きイージングの制御点の値 */
const ctrlPts = (() => {
    const returnObj = {};
    easingTypes.forEach(type => {
        easingDirs.forEach(dir => {
            let value;
            switch (dir) {
                case "In":
                    value = ctrlPt_In[type];
                    break;
                case "Out":
                    value = ctrlPt_Out[type];
                    break;
                case "InOut":
                    value = ctrlPt_InOut[type];
                    break;
                case "OutIn":
                    value = ctrlPt_OutIn[type];
                    break;
                default:
                    break;
            }
            returnObj[`${type}_${dir}`] = value.map(n => Math.round(n * 1e2) / 1e2);
        });
    });
    return returnObj;
})();

/** ================================================================================================
 * 3次ベジェ関数の制御点の座標と媒介変数表示の相互変換関数
================================================================================================= */

/** @type {(t: number, c2: number, c3: number) => number} - 媒介変数表示t → 座標p */
const cubicBezier_t2p = (t, c2, c3) => {
    return 3 * (1 - t) ** 2 * t * c2 + 3 * (1 - t) * t ** 2 * c3 + t ** 3;
};

/** @type {(p: number, c2: number, c3: number) => number[]} - 座標p → 媒介変数表示t */
const cubicBezier_p2t = (p, c2, c3) => {
    const a = 3 * c2 - 3 * c3 + 1;
    const b = -6 * c2 + 3 * c3;
    const c = 3 * c2;
    const d = -p;
    const solutions = cardano(a, b, c, d);
    // 実数解のみ返す
    return solutions.filter(sol => sol.imag === 0).map(sol => sol.real);
};

/** ================================================================================================
 * Easingクラスとしてexport
================================================================================================= */
export class Easing {
    /** @type {string[]} - 名前付きイージングに対応する関数の種類 */
    static named_list = easingNames
    /** @type {(name: string) => [number, number, number, number]} - 名前付きイージングの制御点の値を取得 */
    static getCtrlPts(name) {
        return ctrlPts[name];
    }
    /** @type {(x: number, fn: [number, number, number, number]|string) => number[]} - イージングをかける */
    static convert(x, fn) {
        const ctrlPt = (typeof fn === "string") ? ctrlPts[fn] : fn;
        const [c2x, c2y, c3x, c3y] = ctrlPt;
        // x → t
        const t = cubicBezier_p2t(x, c2x, c3x);
        // t → y
        return t.map(t_ => cubicBezier_t2p(t_, c2y, c3y));
    }
    /** @type {(y: number, fn: [number, number, number, number]|string) => number[]} - イージングを外す */
    static invert(y, fn) {
        const ctrlPt = (typeof fn === "string") ? ctrlPts[fn] : fn;
        const [c2x, c2y, c3x, c3y] = ctrlPt;
        // y → t
        const t = cubicBezier_p2t(y, c2y, c3y);
        // t → x
        return t.map(t_ => cubicBezier_t2p(t_, c2x, c3x));
    }
};
