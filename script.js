import "https://cdn.jsdelivr.net/gh/AXT-AyaKoto/Zahlen.js@v0.7.3/script.js";

/** @description - AXT-AyaKoto/easing.js 各機能 (プライベートプロパティを使いたいのでClassにします) */
const Easing = class Easing {
    /* ======== Private Props ======== */
    /** @type {(str: string) => {type: string, dir: string}} - イージング関数名からイージングの種類と方向を取得 */
    static #getTypeDir(str) {
        const [type, dir] = str.split("_");
        return { type, dir };
    }
    /** @type {(type: string, dir: string) => string} - イージングの種類と方向からイージング関数名を取得 */
    static #getFnName(type, dir) {
        return `${type}_${dir}`;
    }
    /** @type {(a: Zahlen_Qi, b: Zahlen_Qi, c: Zahlen_Qi, d: Zahlen_Qi) => Zahlen_Qi[]} - 3次方程式 ax³+bx²+cx+d=0 の解を返します(カルダノの公式) */
    static #cardano(a, b, c, d) {
        const Z = (n) => Zahlen.new(n);
        // a = 0ならエラー
        if (a.eq(Z(0))) throw new Error("a must be non-zero");
        // 係数の正規化
        const [b_, c_, d_] = [b, c, d].map(n => n.div(a));
        // p, q, u, v
        const p = Z(3).mul(c).sub(b.pow(Z(2))).div(Z(3));
        const q = Z(2).mul(b.pow(Z(3))).sub(Z(9).mul(b).mul(c)).add(Z(27).mul(d)).div(Z(27));
        const u = Zahlen.Math.cbrt(Z(-1).mul(q).div(Z(2)).add(Zahlen.Math.sqrt(q.div(Z(2)).pow(Z(2)).add(p.div(Z(3)).pow(Z(3))))));
        const v = Zahlen.Math.cbrt(Z(-1).mul(q).div(Z(2)).sub(Zahlen.Math.sqrt(q.div(Z(2)).pow(Z(2)).add(p.div(Z(3)).pow(Z(3))))));
        // x1, x2, x3
        const x1 = u.add(v).sub(b.div(Z(3)));
        const x2 = Z(-1).mul(u.add(v)).div(Z(2)).sub(b.div(Z(3))).add(Zahlen.Math.sqrt(Z(3)).mul(u.sub(v)).div(Z(2)).mul(Zahlen.Math.I));
        const x3 = Z(-1).mul(u.add(v)).div(Z(2)).sub(b.div(Z(3))).sub(Zahlen.Math.sqrt(Z(3)).mul(u.sub(v)).div(Z(2)).mul(Zahlen.Math.I));
        return [x1, x2, x3];
    }
    /** @type {(T: number, A: number, B: number) => number} - 3次ベジェ曲線の「時間tから座標pへの変換式」を計算した値を求めます */
    static #bezier_t2p(T, A, B) {
        // p = 3(1-t)²ta + 3(1-t)t²b + t³。Zahlen.jsを使います！！
        const t = Zahlen.new(T);
        const a = Zahlen.new(A);
        const b = Zahlen.new(B);
        const member_1 = Zahlen.new(3).mul(Zahlen.new(1).sub(t).pow(Zahlen.new(2))).mul(t).mul(a);
        const member_2 = Zahlen.new(3).mul(Zahlen.new(1).sub(t)).mul(t.pow(Zahlen.new(2))).mul(b);
        const member_3 = t.pow(Zahlen.new(3));
        return Number(member_1.add(member_2).add(member_3));
    }
    /** @type {(p: number, a: number, b: number) => number[]} - 3次ベジェ曲線の「座標pから時間tへの変換式」を計算した値(実数解)を求めます */
    static #bezier_p2t(p, a, b) {
        // (3a-3b+1)t³ + (3b-6a)t² + 3at -p = 0 をtについて解けばいい。カルダノの公式に投げればOK
        const P = Zahlen.new(p);
        const A = Zahlen.new(a);
        const B = Zahlen.new(b);
        const coefficient_3 = A.mul(Zahlen.new(3)).sub(B.mul(Zahlen.new(3))).add(Zahlen.new(1));
        const coefficient_2 = B.mul(Zahlen.new(3)).sub(A.mul(Zahlen.new(6)));
        const coefficient_1 = A.mul(Zahlen.new(3));
        const coefficient_0 = Zahlen.new(-1).mul(P);
        const answers = this.#cardano(coefficient_3, coefficient_2, coefficient_1, coefficient_0);
        return answers.map(n => +n).filter(n => !Number.isNaN(n));
    }
    /* ======== Public Props ======== */
    /** @type {() => string[]} - 利用可能なイージング関数の一覧を返す */
    static getList() {
        const list = [];
        for (const type of this.validFunctions.types) {
            for (const dir of this.validFunctions.dirs) {
                list.push(this.#getFnName(type, dir));
            }
        }
        return list;
    }
    /** @type {(name: string) => [number, number, number, number]} - 指定された関数の3次ベジェ曲線の制御点の座標を取得([x1, y1, x2, y2]) */
    static getCtrlPoints(name) {
        const { type, dir } = this.#getTypeDir(name);
        /** @description - dirによって分岐 */
        if (dir == "In" || dir == "Out") {
            /** @type {Object<string, [number, number, number, number]>} - 各typeの"In"の場合の制御点の値 */
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
            const In_values = ctrlPt_In[type];
            if (dir == "In") {
                // Inならそのまま返す
                return In_values;
            } else if (dir == "Out") {
                // Inを[x1, y1, x2, y2]とすると、Outは[1-x2, 1-y2, 1-x1, 1-y1]で計算できる
                return [
                    1 - In_values[2],
                    1 - In_values[3],
                    1 - In_values[0],
                    1 - In_values[1],
                ];
            }
        } else if (dir == "InOut" || dir == "OutIn") {
            /** @type {Object<string, [number, number, number, number]>} - 各typeの"InOut"の場合の制御点の値 */
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
            const InOut_values = ctrlPt_InOut[type];
            if (dir == "InOut") {
                // InOutならそのまま返す
                return InOut_values;
            } else if (dir == "OutIn") {
                // InOutを[x1, y1, x2, y2]とすると、OutInは[y1, x1, y2, x2]で計算できる
                return [
                    InOut_values[1],
                    InOut_values[0],
                    InOut_values[3],
                    InOut_values[2],
                ];
            }
        }
        // どれにも当てはまらない場合はnullを返す
        return null;
    }
    /** @type {{types: string[], dirs: string[]}} - 有効なイージング関数の種類と方向 */
    static validFunctions = {
        "types": ["Linear", "Sine", "Quad", "Cubic", "Quart", "Quint", "Expo", "Circ", "Back"],
        "dirs": ["In", "Out", "InOut", "OutIn"],
    }
    /** @type {(fn: string, x: number) => number[]} - 指定された関数で、0〜1の値をイージングした値の候補を返す */
    static convert(fn, x) {
        const ctrlPts = this.getCtrlPoints(fn);
        const t_nominee = this.#bezier_p2t(x, ctrlPts[0], ctrlPts[2]);
        const y_nominee = t_nominee.map(t => this.#bezier_t2p(t, ctrlPts[1], ctrlPts[3]));
        return y_nominee;
    }
    /** @type {(fn: string, y: number) => number[]} - yが「指定された関数で0〜1の値をイージングした値」だと仮定して、イージング前のxの値の候補を返す */
    static invert(fn, y) {
        const ctrlPts = this.getCtrlPoints(fn);
        const t_nominee = this.#bezier_p2t(y, ctrlPts[1], ctrlPts[3]);
        const x_nominee = t_nominee.map(t => this.#bezier_t2p(t, ctrlPts[0], ctrlPts[2]));
        return x_nominee;
    }
}

/** @description - globalThis.Easingに出力 */
globalThis.Easing = Easing;
