/** ================================================================================================
 * AXT-AyaKoto/easing.js
 * copyright (c) 2024- Ayasaka-Koto, All rights reserved.
================================================================================================= */

/** ================================================================================================
 * ベジェ曲線に関する計算に三次方程式が登場するので、三次方程式の解を求める関数を定義
================================================================================================= */

/**
 * 3次以下の方程式の実数解をすべて求める
 * @param {number} a - 3次の係数
 * @param {number} b - 2次の係数
 * @param {number} c - 1次の係数
 * @param {number} d - 定数項
 * @returns {number[]}
 */
const solveAtMostCubic = (a, b, c, d) => {
    /** @description - a = 0 の場合は2次方程式になるので、それを解く */
    if (a === 0) {
        /** @description - b = 0 の場合は1次方程式になるので、それを解く */
        if (b === 0) {
            /** @description - 1次方程式 cx + d = 0 の実数解は x = -d / c */
            return (c === 0) ? [] : [-d / c];
        }
        /** @description - 2次方程式 bx^2 + cx + d = 0 の実数解は x = (-c ± √(c^2 - 4bd)) / 2b */
        // 判別式 : D = c² - 4bd → D > 0 なら2つの実数解、D = 0 なら実数重解、D < 0 なら実数解なし
        const D = c ** 2 - 4 * b * d;
        if (D === 0) {
            return [-c / (2 * b)];
        } else if (D > 0) {
            return [(-c + Math.sqrt(D)) / (2 * b), (-c - Math.sqrt(D)) / (2 * b)];
        } else {
            return [];
        }
    }
    /** @description - 3次方程式 ax^3 + bx^2 + cx + d = 0 → 解の様子に応じて手法を分岐 */
    // 判別式(1) : D₁ = b²c² - 4ac³ - 4b³d - 27a²d² + 18abcd
    const D1 = b ** 2 * c ** 2 - 4 * a * c ** 3 - 4 * b ** 3 * d - 27 * a ** 2 * d ** 2 + 18 * a * b * c * d;
    if (D1 === 0) {
        /** @description - パターン①② : D₁ = 0 → 少なくとも1つの実数重解を持つ */
        // 重解は微分した 3ax² + 2bx + c = 0 の解にもなるので、一旦そっちを求めておく
        const differentiated = solveAtMostCubic(0, 3 * a, 2 * b, c);
        // 判別式(2) : D₂ = -2b³ + 9abc - 27a²d
        const D2 = -2 * b ** 3 + 9 * a * b * c - 27 * a ** 2 * d;
        if (D2 === 0) {
            /** @description - パターン① : D₂ = 0 → 実数の三重解を持つ */
            // このとき、さっき求めた"微分した方程式"は重解になっているのでそのまま返せばOK
            return differentiated;
        } else {
            /** @description - パターン② : D₂ ≠ 0 → 1つの実数重解と1つの実数解を持つ */
            // "微分した方程式"は重解になっていない。どっちかが元の3次方程式の重解なので両方試す
            const multiRoot = differentiated.find(x_ => {
                // 実際に計算してみる
                const left_side = a * x_ ** 3 + b * x_ ** 2 + c * x_ + d;
                // たぶん誤差が出るので、ある程度0に近ければ0とみなして正解とする
                const epsilon = Math.abs(a * Number.EPSILON * 8);
                return Math.abs(left_side) < epsilon;
            });
            if (multiRoot === undefined) throw new Error("???????");
            // もう一つの解は「-(b/3a) + 2×³√(D₂/54a)」になる
            const anotherRoot = -(b / (3 * a)) + 2 * Math.cbrt(D2 / (54 * a));
            return [multiRoot, anotherRoot];
        }
    }
    /** @description パターン③④ : D₁≠0 → どちらにせよ立体完成が必要なのでやる */
    // 各係数をaで割って x₃ + Bx² + Cx + D = 0 の形にする
    const [B, C, D] = [b, c, d].map(n => n / a);
    // x = y - B/3 として変数変換をすると二次の項が消えて y³ + py + q = 0 になる
    // このときの p, q の値を求める
    const p = C - B ** 2 / 3;
    const q = D - (C * B / 3) + (2 * B ** 3 / 27);
    // 分岐内で求めたyを入れる配列を先に用意
    const y_ = [];
    if (D1 > 0) {
        /** @description - パターン③ : D₁ > 0 → 相異なる3つの実数解を持つ */
        // 方針 : このパターンの場合は"ビエトの方法"が有効なので、立法完成してからそれを使う
        // A = 2 * √(-p/3)、θ = 1/3 * acos((3q/2p)×√(-p/3)) とする
        const A = 2 * Math.sqrt(-p / 3);
        const theta = (1 / 3) * Math.acos((3 * q / (2 * p)) * Math.sqrt(-3 / p));
        //  y³ + py + q = 0 の解は y = A * cos(θ), A * cos(θ + 2π/3), A * cos(θ + 4π/3) になる
        const y1 = A * Math.cos(theta);
        const y2 = A * Math.cos(theta + 2 * Math.PI / 3);
        const y3 = A * Math.cos(theta + 4 * Math.PI / 3);
        // yを配列に入れる
        y_.push(y1, y2, y3);
    } else {
        // y = u + v と置いて、u³ + v³ = -q, 3uv = p となるようなu, vについて考える
        // u³, v³ = -(q / 2) ± √((q/2)² + (p/3)²) となる
        const u_3 = -(q / 2) + Math.sqrt((q / 2) ** 2 + (p / 3) ** 3);
        const v_3 = -(q / 2) - Math.sqrt((q / 2) ** 2 + (p / 3) ** 3);
        // u, vを求める (立方根をとるだけ)
        const u = Math.cbrt(u_3);
        const v = Math.cbrt(v_3);
        // y = u + v
        y_.push(u + v);
    }
    // x = y - B/3 としてxを求める
    const x = y_.map(y => y - B / 3);
    // return
    return x;
}

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
    "Linear": [0.00, 0.00, 1.00, 1.00],
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
    "Linear": [0.00, 0.00, 1.00, 1.00],
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
    const solutions = solveAtMostCubic(a, b, c, d);
    console.log(a, b, c, d, solutions);
    // 実数解のみ返す
    return solutions;
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
        // x<=0なら0、x>=1なら1を返す
        if (x <= 0) return [0];
        if (x >= 1) return [1];
        // 制御点を取得
        const ctrlPt = (typeof fn === "string") ? ctrlPts[fn] : fn;
        const [c2x, c2y, c3x, c3y] = ctrlPt;
        // x → t
        const t = cubicBezier_p2t(x, c2x, c3x).filter(t => 0 <= t && t <= 1);
        // t → y
        return t.map(t_ => cubicBezier_t2p(t_, c2y, c3y));
    }
    /** @type {(y: number, fn: [number, number, number, number]|string) => number[]} - イージングを外す */
    static invert(y, fn) {
        // y<=0なら0、y>=1なら1を返す
        if (y <= 0) return [0];
        if (y >= 1) return [1];
        // 制御点を取得
        const ctrlPt = (typeof fn === "string") ? ctrlPts[fn] : fn;
        const [c2x, c2y, c3x, c3y] = ctrlPt;
        // y → t
        const t = cubicBezier_p2t(y, c2y, c3y).filter(t => 0 <= t && t <= 1);
        // t → x
        return t.map(t_ => cubicBezier_t2p(t_, c2x, c3x));
    }
    static cubicBezier_t2p = cubicBezier_t2p
};
