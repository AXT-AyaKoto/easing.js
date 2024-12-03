/*
import "https://cdn.jsdelivr.net/gh/AXT-AyaKoto/Zahlen.js@v0.7/script.js";
const Zahlen = globalThis.Zahlen;
*/

// @ts-check

/**
 * Zahlen.jsにおける最も適切な数値表現を生成する
 * @param {bigint|number|Zahlen_Qi|Zahlen_Q|Zahlen_Z} n - 生成する数値
 * @returns {Zahlen_Qi|Zahlen_Q|Zahlen_Z}
 */
const Zahlen_new = (n) => {
    /** bigintの場合 : そのままZahlen_Zに変換するだけ */
    if (typeof n === 'bigint') return new Zahlen_Z(n);
    /** numberの場合 : 十分な近似値を表すZahlen_Qに変換する */
    if (typeof n === 'number') return Zahlen_tools.approximation(n);
    /** Zahlen_Qiの場合 : 虚部が0ならZahlen_Qに変換、さらに実部の分母が1ならZahlen_Zに変換、それ以外ならQiで返す */
    if (n instanceof Zahlen_Qi) {
        if (n.In === 0n) {
            if (n.Rd === 1n) return new Zahlen_Z(n.Rn);
            else return new Zahlen_Q(n.Rn, n.Rd);
        }
        return new Zahlen_Qi(n.Rn, n.Rd, n.In, n.Id);
    }
    /* ---- いずれでもなければエラーを返す ---- */
    throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
};

/** @description - Zahlen.jsの実装で使う関数諸々 */
const Zahlen_tools = {
    /**
     * aとbの最大公約数をユークリッドの互除法で求める
     * @param {bigint} a - 整数a
     * @param {bigint} b - 整数b
     * @returns {bigint} - aとbの最大公約数
     */
    "gcd": (a, b) => {
        if (b === 0n) return a;
        if (a < b) return Zahlen_tools.gcd(b, a);
        return Zahlen_tools.gcd(b, a % b);
    },
    /**
     * aの絶対値を求める
     * @param {bigint} a - 整数a
     * @returns {bigint} - aの絶対値
     */
    "abs": a => {
        return a < 0n ? -a : a;
    },
    /**
     * aの符号を求める
     * @param {bigint} a - 整数a
     * @returns {bigint} - aの符号(負:-1n, 正:1n, 0:0n)
     */
    "sign": a => {
        return a < 0n ? -1n : a > 0n ? 1n : 0n;
    },
    /**
     * aの十分な近似値を表すZahlen_Q(有理数)を生成する
     * @param {number} a - 実数a
     * @returns {Zahlen_Q} - aの十分な近似値を表すZahlen_Q
     */
    "approximation": (a) => {
        /** @description - aが特殊な値の場合 */
        // a === 0 → 0/1
        if (a === 0) return new Zahlen_Q(0n, 1n);
        // a === NaN → 0/0
        if (Number.isNaN(a)) return new Zahlen_Q(0n, 0n);
        // a === +Infinity → 1/0
        if (a === Infinity) return new Zahlen_Q(1n, 0n);
        // a === -Infinity → -1/0
        if (a === -Infinity) return new Zahlen_Q(-1n, 0n);
        /** @description - aが通常の値の場合 */
        /** @type {(num: number) => string} - numberを「そのnumberがIEE 754倍精度浮動小数点数ではどのようなビット列で表現されるか」を表すstringに変換 */
        const numberToBinaryStr = (num) => {
            const buffer = new ArrayBuffer(64);
            const view = new DataView(buffer);
            view.setFloat64(0, num);
            let str = "";
            for (let i = 0; i < 8; i++) {
                str += view.getUint8(i).toString(2).padStart(8, "0");
            }
            return str;
        };
        /** @type {(binary: string) => {n: bigint, d: bigint}} - binaryは0か1で構成された64文字の文字列。binaryで表されるビット列をIEEE754倍精度浮動小数点数として読んだときのnumberに等しい有理数n/dのnとdを返す */
        const binaryStrToRationalNumber = (binary) => {
            const signStr = binary[0];
            const expoStr = binary.substring(1, 12);
            const mantStr = binary.substring(12, 64);

            const mant_n = BigInt(`0b1${mantStr}`);
            const mant_d = 2n ** 52n;

            const expo_unoffset = BigInt(`0b${expoStr}`) - 1023n;
            let expo_n, expo_d;
            if (expo_unoffset >= 0n) {
                expo_n = 2n ** expo_unoffset;
                expo_d = 1n;
            } else {
                expo_n = 1n;
                expo_d = 2n ** (expo_unoffset * -1n);
            }

            const modulus_n = expo_n * mant_n;
            const modulus_d = expo_d * mant_d;

            /** @type {(a: bigint, b: bigint) => bigint} - 最大公約数を求める(a≧b) */
            const gcd = (a, b) => b === 0n ? a : a < b ? gcd(b, a) : gcd(b, a % b);

            const irreducible_modulus_n = modulus_n / gcd(modulus_n, modulus_d);
            const irreducible_modulus_d = modulus_d / gcd(modulus_n, modulus_d);

            if (signStr == "0") {
                return { "n": irreducible_modulus_n, "d": irreducible_modulus_d };
            } else {
                return { "n": -1n * irreducible_modulus_n, "d": irreducible_modulus_d };
            }
        };
        /** @type {string} - aのIEEE754倍精度浮動小数点数表現を表すビット列 */
        const binaryStr = numberToBinaryStr(a);
        /** @type {{n: bigint, d: bigint}} - aに等しい有理数n/dのnとdを持つオブジェクト */
        const rational = binaryStrToRationalNumber(binaryStr);
        return new Zahlen_Q(rational.n, rational.d);
    },
    /**
     * ニュートン法を用いて、mのn乗根(の近似値)(の主値)を求める
     * @param {Zahlen_Q} m - 有理数m
     * @param {Zahlen_Z} n - 自然数n
     * @returns {Zahlen_Q} - mのn乗根(の近似値)(の主値)
     */
    "nthRoot": (m, n) => {
        /** @type {Zahlen_Q[]} - x_0, x_1…… */
        const x = [new Zahlen_Q(1n, 1n)];
        /** @description - ニュートン法の反復 */
        for (let s = 0; s < 65536; s++) {
            /** @type {Zahlen_Q} f(x_s) */
            const f_x_s = Zahlen_Math.sub(Zahlen_Math.pow(x[s], n), m);
            /** @type {Zahlen_Q} f'(x_s) */
            const f_prime_x_s = Zahlen_Math.mul(n, Zahlen_Math.pow(x[s], Zahlen_Math.sub(n, Zahlen_new(1n))));
            /** @type {Zahlen_Q} x_{s+1} */
            const x_s_plus_1 = Zahlen_Math.sub(x[s], Zahlen_Math.div(f_x_s, f_prime_x_s));
            /** @type {Zahlen_Q} x_{s+1} の整数部分 */
            const x_s_plus_1_trunc = Zahlen_Math.trunc(x_s_plus_1);
            /** @type {Zahlen_Q} x_{s+1} の小数部分 */
            const x_s_plus_1_frac = Zahlen_Math.sub(x_s_plus_1, x_s_plus_1_trunc);
            /** @type {Zahlen_Q} x_{s+1} の小数部分をZahlen_new(approximation)で適度に近似した値 */
            const x_s_plus_1_frac_approx = Zahlen_new(Number(x_s_plus_1_frac));
            /** @type {Zahlen_Q} x_{s+1} の整数部分と小数部分の和 */
            x.push(Zahlen_Math.add(x_s_plus_1_trunc, x_s_plus_1_frac_approx));
            /** @description - 収束判定(前のステップと値が同じならbreak) */
            if (x[s].eq(x[s + 1])) break;
        }
        const answer = x.at(-1);
        if (answer === undefined) throw new Error("[Zahlen.js] Zahlen_Math nthRoot Error");
        return answer;
    },
};

/**
 * @class Zahlen_Qi - ガウス有理数(ℚ[i])
 * @property {bigint} Rn - 実部の分子(ℤ, 絶対値はRdと互いに素でなくてもOK)
 * @property {bigint} Rd - 実部の分母(ℕ(∌0), 絶対値はRnと互いに素でなくてもOK)
 * @property {bigint} In - 虚部の分子(ℤ, 絶対値はIdと互いに素でなくてもOK)
 * @property {bigint} Id - 虚部の分母(ℕ(∌0), 絶対値はInと互いに素でなくてもOK)
 */
const Zahlen_Qi = class Zahlen_Qi {
    /**
     * @param {bigint} Rn - 実部の分子(ℤ)
     * @param {bigint} Rd - 実部の分母(ℤ)
     * @param {bigint} In - 虚部の分子(ℤ)
     * @param {bigint} Id - 虚部の分母(ℤ)
     */
    constructor(Rn, Rd, In, Id) {
        /** @type {bigint[]} - 4引数の絶対値を求める */
        const [Rn_abs, Rd_abs, In_abs, Id_abs] = [Rn, Rd, In, Id].map(Zahlen_tools.abs);
        /** @type {bigint[]} - 実部と虚部の符号を求める */
        const [R_sign, I_sign] = [Rn * Rd, In * Id].map(Zahlen_tools.sign);
        /** @type {bigint[]} - 実部と虚部それぞれで、分母と分子の最大公約数を求める */
        const [R_gcd, I_gcd] = [[Rn_abs, Rd_abs], [In_abs, Id_abs]].map(([a, b]) => Zahlen_tools.gcd(a, b));
        /** @type {bigint[]} - 実部と虚部それぞれで、分母と分子(の絶対値)を最大公約数で割って約分する */
        const [Rn_reduced, Rd_reduced] = [Rn_abs / R_gcd, Rd_abs / R_gcd];
        const [In_reduced, Id_reduced] = [In_abs / I_gcd, Id_abs / I_gcd];
        /** @description - 符号を分子に掛けて、プロパティに代入する */
        /** @type {bigint} - 実部の分子(ℤ, 絶対値はRdと互いに素) */
        this.Rn = Rn_reduced * R_sign;
        /** @type {bigint} - 実部の分母(ℕ(∌0), 絶対値はRnと互いに素) */
        this.Rd = Rd_reduced;
        /** @type {bigint} - 虚部の分子(ℤ, 絶対値はIdと互いに素) */
        this.In = In_reduced * I_sign;
        /** @type {bigint} - 虚部の分母(ℕ(∌0), 絶対値はInと互いに素) */
        this.Id = Id_reduced;
    }
    /** @type {() => number} - このガウス有理数をnumberに変換する */
    valueOf() {
        return Number(this.Rn) / Number(this.Rd) + Number(this.In) / Number(this.Id) * Math.sqrt(-1);
    }
    /** @type {() => string} - このガウス有理数をstringに変換する */
    toString() {
        return `${this.Rn}/${this.Rd} + ${this.In}/${this.Id}i`;
    }
    /* ======== Pythonのcomplex型をベースにしたメソッド/プロパティ ======== */
    /** @type {Zahlen_Q} - 実部 */
    get real() {
        return new Zahlen_Q(this.Rn, this.Rd);
    }
    /** @type {Zahlen_Q} - 虚部 */
    get imag() {
        return new Zahlen_Q(this.In, this.Id);
    }
    /** @type {() => Zahlen_Q} - 共役な複素数 */
    conjugate() {
        return Zahlen_new(new Zahlen_Qi(this.Rn, this.Rd, -this.In, this.Id));
    }
    /* ======== 一般に中置演算子で表されることが多い各種演算 ======== */
    /** @type {(y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 加算(`x + y`) */
    add(y) {
        return Zahlen_Math.add(this, y);
    }
    /** @type {(y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 減算(`x - y`) */
    sub(y) {
        return Zahlen_Math.sub(this, y);
    }
    /** @type {(y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 乗算(`x * y`) */
    mul(y) {
        return Zahlen_Math.mul(this, y);
    }
    /** @type {(y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 除算(`x / y`) */
    div(y) {
        return Zahlen_Math.div(this, y);
    }
    /** @type {(y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 剰余(`x % y`) */
    mod(y) {
        return Zahlen_Math.mod(this, y);
    }
    /** @type {(y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 累乗(`x ** y`) */
    pow(y) {
        return Zahlen_Math.pow(this, y);
    }
    /** @type {(y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => boolean} - 等価(`x == y`) */
    eq(y) {
        return Zahlen_Math.eq(this, y);
    }
    /** @type {(y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => boolean} - 不等価(`x != y`) */
    ne(y) {
        return Zahlen_Math.ne(this, y);
    }
    /** @type {(y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => boolean} - 小なり(`x < y`) */
    lt(y) {
        return Zahlen_Math.lt(this, y);
    }
    /** @type {(y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => boolean} - 小なりイコール(`x <= y`) */
    le(y) {
        return Zahlen_Math.le(this, y);
    }
    /** @type {(y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => boolean} - 大なり(`x > y`) */
    gt(y) {
        return Zahlen_Math.gt(this, y);
    }
    /** @type {(y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => boolean} - 大なりイコール(`x >= y`) */
    ge(y) {
        return Zahlen_Math.ge(this, y);
    }
};

/**
 * @class Zahlen_Q - 有理数(ℚ)
 * @extends Zahlen_Qi
 * @property {bigint} Rn - 分子(ℤ, 絶対値はRdと互いに素)
 * @property {bigint} Rd - 分母(ℕ(∌0), 絶対値はRnと互いに素)
 * @property {0n} In - 虚部の分子(※有理数なので常に0)
 * @property {1n} Id - 虚部の分母(※有理数なので常に1)
 */
const Zahlen_Q = class Zahlen_Q extends Zahlen_Qi {
    /**
     * @param {bigint} Rn - 分子(ℤ)
     * @param {bigint} Rd - 分母(ℤ)
     */
    constructor(Rn, Rd) {
        super(Rn, Rd, 0n, 1n);
    }
    /** @type {() => number} - この有理数をnumberに変換する */
    valueOf() {
        return Number(this.Rn) / Number(this.Rd);
    }
    /** @type {() => string} - この有理数をstringに変換する */
    toString() {
        return `${this.Rn}/${this.Rd}`;
    }
};

/**
 * @class Zahlen_Z - 整数(ℤ)
 * @extends Zahlen_Q
 * @property {bigint} Rn - 数
 * @property {1n} Rd - 分母(※整数なので常に1)
 * @property {0n} In - 虚部の分子(※整数なので常に0)
 * @property {1n} Id - 虚部の分母(※整数なので常に1)
 */
const Zahlen_Z = class Zahlen_Z extends Zahlen_Q {
    /**
     * @param {bigint} Rn - 数
     */
    constructor(Rn) {
        super(Rn, 1n);
    }
    /** @type {() => number} - この整数をnumberに変換する */
    valueOf() {
        return Number(this.Rn);
    }
    /** @type {() => string} - この整数をstringに変換する */
    toString() {
        return `${this.Rn}`;
    }
};

/** @description - Zahlen.js専用の数学関数etcを実装したオブジェクト群 */
const Zahlen_Math = {
    /** ======== 定数 ======== **/
    /** @type {Zahlen_Q} - ネイピア数の近似値 */
    E: Zahlen_new(Math.E),
    /** @type {Zahlen_Q} - 2の自然対数の近似値 */
    LN2: Zahlen_new(Math.LN2),
    /** @type {Zahlen_Q} - 10の自然対数の近似値 */
    LN10: Zahlen_new(Math.LN10),
    /** @type {Zahlen_Q} - 自然対数の底と2の底の対数の近似値 */
    LOG2E: Zahlen_new(Math.LOG2E),
    /** @type {Zahlen_Q} - 自然対数の底と10の底の対数の近似値 */
    LOG10E: Zahlen_new(Math.LOG10E),
    /** @type {Zahlen_Q} - 円周率の近似値 */
    PI: Zahlen_new(Math.PI),
    /** @type {Zahlen_Q} - 1/2の平方根の近似値 */
    SQRT1_2: Zahlen_new(Math.SQRT1_2),
    /** @type {Zahlen_Q} - 2の平方根の近似値 */
    SQRT2: Zahlen_new(Math.SQRT2),
    /** @type {Zahlen_Qi} - 虚数単位i */
    I: Zahlen_new(new Zahlen_Qi(0n, 1n, 1n, 1n)),
    /** ======== 丸め・特徴 ======== **/
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 切り上げを返す */
    ceil: x => {
        /* ---- Z範囲 : なにもしない ---- */
        if (x instanceof Zahlen_Z) return x;
        /* ---- Q範囲 : 正ならtruncに+1、負ならtruncそのまま ---- */
        if (x instanceof Zahlen_Q) {
            if (x.Rn >= 0n) return Zahlen_Math.add(Zahlen_Math.trunc(x), new Zahlen_Z(1n));
            else return Zahlen_Math.trunc(x);
        }
        /* ---- Qi範囲 : 実部と虚部それぞれでceilを取って設定し直す ---- */
        if (x instanceof Zahlen_Qi) {
            const real_ceil = Zahlen_Math.ceil(new Zahlen_Q(x.Rn, x.Rd));
            const imag_ceil = Zahlen_Math.ceil(new Zahlen_Q(x.In, x.Id));
            return Zahlen_new(new Zahlen_Qi(real_ceil.Rn, real_ceil.Rd, imag_ceil.Rn, imag_ceil.Rd));
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 切り捨てを返す */
    floor: x => {
        /* ---- Z範囲 : なにもしない ---- */
        if (x instanceof Zahlen_Z) return x;
        /* ---- Q範囲 : 正ならtruncそのまま、負ならtruncに-1 ---- */
        if (x instanceof Zahlen_Q) {
            if (x.Rn >= 0n) return Zahlen_Math.trunc(x);
            else return Zahlen_Math.sub(Zahlen_Math.trunc(x), new Zahlen_Z(1n));
        }
        /* ---- Qi範囲 : 実部と虚部それぞれでfloorを取って設定し直す ---- */
        if (x instanceof Zahlen_Qi) {
            const real_floor = Zahlen_Math.floor(new Zahlen_Q(x.Rn, x.Rd));
            const imag_floor = Zahlen_Math.floor(new Zahlen_Q(x.In, x.Id));
            return Zahlen_new(new Zahlen_Qi(real_floor.Rn, real_floor.Rd, imag_floor.Rn, imag_floor.Rd));
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 四捨五入を返す */
    round: x => {
        /* ---- Z範囲 : なにもしない ---- */
        if (x instanceof Zahlen_Z) return x;
        /* ---- Q範囲 : 正なら+1/2のfloor、負なら-1/2のceilに ---- */
        if (x instanceof Zahlen_Q) {
            if (x.Rn >= 0n) return Zahlen_Math.floor(Zahlen_Math.add(x, new Zahlen_Q(1n, 2n)));
            else return Zahlen_Math.ceil(Zahlen_Math.sub(x, new Zahlen_Q(1n, 2n)));
        }
        /* ---- Qi範囲 : 実部と虚部それぞれでroundを取って設定し直す ---- */
        if (x instanceof Zahlen_Qi) {
            const real_round = Zahlen_Math.round(new Zahlen_Q(x.Rn, x.Rd));
            const imag_round = Zahlen_Math.round(new Zahlen_Q(x.In, x.Id));
            return Zahlen_new(new Zahlen_Qi(real_round.Rn, real_round.Rd, imag_round.Rn, imag_round.Rd));
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 整数部分を返す */
    trunc: x => {
        /* ---- Z範囲 : なにもしない ---- */
        if (x instanceof Zahlen_Z) return x;
        /* ---- Q範囲 : bigintでxRn/xRdをやったら整数部分が返ってくる ---- */
        if (x instanceof Zahlen_Q) {
            return new Zahlen_Z(x.Rn / x.Rd);
        }
        /* ---- Qi範囲 : 実部と虚部それぞれでtruncを取って設定し直す ---- */
        if (x instanceof Zahlen_Qi) {
            const real_trunc = Zahlen_Math.trunc(new Zahlen_Q(x.Rn, x.Rd));
            const imag_trunc = Zahlen_Math.trunc(new Zahlen_Q(x.In, x.Id));
            return Zahlen_new(new Zahlen_Qi(real_trunc.Rn, real_trunc.Rd, imag_trunc.Rn, imag_trunc.Rd));
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 絶対値を返す */
    abs: x => {
        /* ---- Q範囲 : RnとInをそれぞれabsに通して設定し直す ---- */
        if (x instanceof Zahlen_Q) return Zahlen_new(new Zahlen_Q(Zahlen_tools.abs(x.Rn), x.Rd));
        /* ---- Qi範囲 : 実部と虚部で三平方の定理。hypotで計算できる ---- */
        if (x instanceof Zahlen_Qi) {
            return Zahlen_new(Zahlen_Math.hypot(new Zahlen_Q(x.Rn, x.Rd), new Zahlen_Q(x.In, x.Id)));
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 符号を返す */
    sign: x => {
        /* ---- Qi範囲 : RnとInをそれぞれsignに通して設定し直す ---- */
        if (x instanceof Zahlen_Qi) return Zahlen_new(new Zahlen_Qi(Zahlen_tools.sign(x.Rn), 1n, Zahlen_tools.sign(x.In), 1n));
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** ======== 四則演算 ======== **/
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z, y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 加算を返す */
    add: (x, y) => {
        /* ---- Q範囲 : xRn/xRd + yRn/yRd = (xRn*yRd + yRn*xRd) / (xRd*yRd) ---- */
        if (x instanceof Zahlen_Q && y instanceof Zahlen_Q) {
            return Zahlen_new(new Zahlen_Q(x.Rn * y.Rd + y.Rn * x.Rd, x.Rd * y.Rd));
        }
        /* ---- Qi範囲 : 実部と虚部をそれぞれZahlen_Qで表して定義通りやって戻す ---- */
        if (x instanceof Zahlen_Qi && y instanceof Zahlen_Qi) {
            const [x_real, x_imag] = [new Zahlen_Q(x.Rn, x.Rd), new Zahlen_Q(x.In, x.Id)];
            const [y_real, y_imag] = [new Zahlen_Q(y.Rn, y.Rd), new Zahlen_Q(y.In, y.Id)];
            // (a+bi)+(c+di) = (a+c)+(b+d)i
            const ans_real = Zahlen_Math.add(x_real, y_real);
            const ans_imag = Zahlen_Math.add(x_imag, y_imag);
            return Zahlen_new(new Zahlen_Qi(ans_real.Rn, ans_real.Rd, ans_imag.Rn, ans_imag.Rd));
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z, y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 減算を返す */
    sub: (x, y) => {
        /* ---- Q範囲 : xRn/xRd - yRn/yRd = (xRn*yRd - yRn*xRd) / (xRd*yRd) ---- */
        if (x instanceof Zahlen_Q && y instanceof Zahlen_Q) {
            return Zahlen_new(new Zahlen_Q(x.Rn * y.Rd - y.Rn * x.Rd, x.Rd * y.Rd));
        }
        /* ---- Qi範囲 : 実部と虚部をそれぞれZahlen_Qで表して定義通りやって戻す ---- */
        if (x instanceof Zahlen_Qi && y instanceof Zahlen_Qi) {
            const [x_real, x_imag] = [new Zahlen_Q(x.Rn, x.Rd), new Zahlen_Q(x.In, x.Id)];
            const [y_real, y_imag] = [new Zahlen_Q(y.Rn, y.Rd), new Zahlen_Q(y.In, y.Id)];
            // (a+bi)-(c+di) = (a-c)+(b-d)i
            const ans_real = Zahlen_Math.sub(x_real, y_real);
            const ans_imag = Zahlen_Math.sub(x_imag, y_imag);
            return Zahlen_new(new Zahlen_Qi(ans_real.Rn, ans_real.Rd, ans_imag.Rn, ans_imag.Rd));
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z, y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 乗算を返す */
    mul: (x, y) => {
        /* ---- Q範囲 : xRn/xRd * yRn/yRd = (xRn*yRn) / (xRd*yRd) ---- */
        if (x instanceof Zahlen_Q && y instanceof Zahlen_Q) {
            return Zahlen_new(new Zahlen_Q(x.Rn * y.Rn, x.Rd * y.Rd));
        }
        /* ---- Qi範囲 : 実部と虚部をそれぞれZahlen_Qで表して定義通りやって戻す ---- */
        if (x instanceof Zahlen_Qi && y instanceof Zahlen_Qi) {
            const [x_real, x_imag] = [new Zahlen_Q(x.Rn, x.Rd), new Zahlen_Q(x.In, x.Id)];
            const [y_real, y_imag] = [new Zahlen_Q(y.Rn, y.Rd), new Zahlen_Q(y.In, y.Id)];
            // (a+bi)*(c+di) = (ac-bd)+(ad+bc)i
            const ans_real = Zahlen_Math.sub(Zahlen_Math.mul(x_real, y_real), Zahlen_Math.mul(x_imag, y_imag));
            const ans_imag = Zahlen_Math.add(Zahlen_Math.mul(x_real, y_imag), Zahlen_Math.mul(x_imag, y_real));
            return Zahlen_new(new Zahlen_Qi(ans_real.Rn, ans_real.Rd, ans_imag.Rn, ans_imag.Rd));
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z, y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 除算を返す */
    div: (x, y) => {
        /* ---- Q範囲 : (xRn/xRd )/ (yRn/yRd) = (xRn*yRd) / (xRd*yRn) ---- */
        if (x instanceof Zahlen_Q && y instanceof Zahlen_Q) {
            return Zahlen_new(new Zahlen_Q(x.Rn * y.Rd, x.Rd * y.Rn));
        }
        /* ---- Qi範囲 : 実部と虚部をそれぞれZahlen_Qで表して定義通りやって戻す ---- */
        if (x instanceof Zahlen_Qi && y instanceof Zahlen_Qi) {
            const [x_real, x_imag] = [new Zahlen_Q(x.Rn, x.Rd), new Zahlen_Q(x.In, x.Id)];
            const [y_real, y_imag] = [new Zahlen_Q(y.Rn, y.Rd), new Zahlen_Q(y.In, y.Id)];
            // (a+bi)/(c+di) = (ac+bd)/(c²+d²) + ((bc-ad)/(c²+d²))i
            const denominator = Zahlen_Math.add(Zahlen_Math.pow(y_real, new Zahlen_Z(2n)), Zahlen_Math.pow(y_imag, new Zahlen_Z(2n)));
            const ans_real = Zahlen_Math.div(Zahlen_Math.add(Zahlen_Math.mul(x_real, y_real), Zahlen_Math.mul(x_imag, y_imag)), denominator);
            const ans_imag = Zahlen_Math.div(Zahlen_Math.sub(Zahlen_Math.mul(x_imag, y_real), Zahlen_Math.mul(x_real, y_imag)), denominator);
            return Zahlen_new(new Zahlen_Qi(ans_real.Rn, ans_real.Rd, ans_imag.Rn, ans_imag.Rd));
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z, y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 剰余を返す */
    mod: (x, y) => {
        /* ---- Q範囲 : まあ定義に沿ってやるだけ…… ---- */
        if (x instanceof Zahlen_Q && y instanceof Zahlen_Q) {
            /* -- 正数の場合 : 任意の正数x,yについて x mod y = x - y*trunc(x/y) -- */
            if (Zahlen_tools.sign(x.Rn) >= 0n && Zahlen_tools.sign(y.Rn) >= 0n) {
                return Zahlen_Math.sub(x, Zahlen_Math.mul(y, Zahlen_Math.trunc(Zahlen_Math.div(x, y))));
            }
            /* -- 負数の場合 : 任意の実数x,yについて x mod y = (xの符号)×(|x| mod |y|) -- */
            const x_sign = Zahlen_tools.sign(x.Rn);
            const x_abs = new Zahlen_Q(Zahlen_tools.abs(x.Rn), x.Rd);
            const y_abs = new Zahlen_Q(Zahlen_tools.abs(y.Rn), y.Rd);
            return Zahlen_Math.mul(new Zahlen_Q(x_sign, 1n), Zahlen_Math.mod(x_abs, y_abs));
        }
        /* ---- Qi範囲 : x mod y = (y/(2πi))log(e^((2π/y)ix)) ---- */
        if (x instanceof Zahlen_Qi && y instanceof Zahlen_Qi) {
            const two_pi = Zahlen_Math.mul(Zahlen_new(2n), Zahlen_Math.PI);
            const two_pi_i = Zahlen_Math.mul(two_pi, Zahlen_Math.I);
            const two_pi_div_y = Zahlen_Math.div(two_pi, y);
            const log = Zahlen_Math.log(Zahlen_Math.exp(Zahlen_Math.mul(two_pi_div_y, Zahlen_Math.mul(Zahlen_Math.I, x))));
            return Zahlen_Math.mul(Zahlen_Math.div(y, two_pi_i), log);
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** ======== 比較演算 ======== **/
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z, y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => boolean} - 等価を返す */
    eq: (x, y) => {
        /* ---- Qi範囲 : Zahlen_newに通したうえで、各プロパティを比較して全て等価ならtrue ---- */
        if (x instanceof Zahlen_Qi && y instanceof Zahlen_Qi) {
            const x_new = Zahlen_new(x);
            const y_new = Zahlen_new(y);
            return x_new.Rn === y_new.Rn && x_new.Rd === y_new.Rd && x_new.In === y_new.In && x_new.Id === y_new.Id;
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z, y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => boolean} - 不等価を返す */
    ne: (x, y) => {
        /* ---- Qi範囲 : 等価の否定を返す ---- */
        if (x instanceof Zahlen_Qi && y instanceof Zahlen_Qi) {
            return !Zahlen_Math.eq(x, y);
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z, y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => boolean} - x < y */
    lt: (x, y) => {
        /* ---- Q範囲 : xRn/xRd < yRn/yRd  ⇔  xRn*yRd < yRn*xRd ---- */
        if (x instanceof Zahlen_Q && y instanceof Zahlen_Q) {
            return x.Rn * y.Rd < y.Rn * x.Rd;
        }
        /* ---- Qi範囲 : 絶対値で比較 ---- */
        if (x instanceof Zahlen_Qi && y instanceof Zahlen_Qi) {
            const x_abs = Zahlen_Math.abs(x);
            const y_abs = Zahlen_Math.abs(y);
            return Zahlen_Math.lt(x_abs, y_abs);
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z, y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => boolean} - x <= y */
    le: (x, y) => {
        /* ---- Qi範囲 : gtの否定を返す ---- */
        if (x instanceof Zahlen_Qi && y instanceof Zahlen_Qi) {
            return !Zahlen_Math.gt(x, y);
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z, y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => boolean} - x > y */
    gt: (x, y) => {
        /* ---- Qi範囲 : xとyを逆にしてltを使う ---- */
        if (x instanceof Zahlen_Qi && y instanceof Zahlen_Qi) {
            return Zahlen_Math.lt(y, x);
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z, y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => boolean} - x >= y */
    ge: (x, y) => {
        /* ---- Qi範囲 : ltの否定を返す ---- */
        if (x instanceof Zahlen_Qi && y instanceof Zahlen_Qi) {
            return !Zahlen_Math.lt(x, y);
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** ======== 三角関数・逆三角関数 ======== **/
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 正弦を返す */
    sin: x => {
        /* ---- Q範囲 : Zahlen_newがnumber→Zahlen_Qをやってくれるので、Math.sinを借りちゃえばOK ---- */
        if (x instanceof Zahlen_Q) return Zahlen_new(Math.sin(Number(x)));
        /* ---- Qi範囲 : sin z = (e^iz - e^(-iz)) / 2i ---- */
        if (x instanceof Zahlen_Qi) {
            const exp_iz = Zahlen_Math.exp(Zahlen_Math.mul(x, Zahlen_Math.I));
            const exp_minus_iz = Zahlen_Math.exp(Zahlen_Math.mul(Zahlen_Math.neg(x), Zahlen_Math.I));
            const exp_diff = Zahlen_Math.sub(exp_iz, exp_minus_iz);
            return Zahlen_Math.div(exp_diff, Zahlen_Math.mul(Zahlen_Math.I, Zahlen_new(2n)));
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 余弦を返す */
    cos: x => {
        /* ---- Q範囲 : Zahlen_newがnumber→Zahlen_Qをやってくれるので、Math.cosを借りちゃえばOK ---- */
        if (x instanceof Zahlen_Q) return Zahlen_new(Math.cos(Number(x)));
        /* ---- Qi範囲 : cos z = (e^iz + e^(-iz)) / 2 ---- */
        if (x instanceof Zahlen_Qi) {
            const exp_iz = Zahlen_Math.exp(Zahlen_Math.mul(x, Zahlen_Math.I));
            const exp_minus_iz = Zahlen_Math.exp(Zahlen_Math.mul(Zahlen_Math.neg(x), Zahlen_Math.I));
            const exp_sum = Zahlen_Math.add(exp_iz, exp_minus_iz);
            return Zahlen_Math.div(exp_sum, Zahlen_new(2n));
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 正接を返す */
    tan: x => {
        /* ---- Q範囲 : Zahlen_newがnumber→Zahlen_Qをやってくれるので、Math.tanを借りちゃえばOK ---- */
        if (x instanceof Zahlen_Q) return Zahlen_new(Math.tan(Number(x)));
        /* ---- Qi範囲 : tan z = sin z / cos z ---- */
        if (x instanceof Zahlen_Qi) return Zahlen_Math.div(Zahlen_Math.sin(x), Zahlen_Math.cos(x));
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 逆正弦を返す */
    asin: x => {
        /* ---- Q範囲 : Zahlen_newがnumber→Zahlen_Qをやってくれるので、Math.asinを借りちゃえばOK ---- */
        if (x instanceof Zahlen_Q) return Zahlen_new(Math.asin(Number(x)));
        /* ---- Qi範囲 : asin x = -i log( ix + sqrt( 1 - x^2 ) ) ---- */
        if (x instanceof Zahlen_Qi) {
            const ix = Zahlen_Math.mul(Zahlen_Math.I, x);
            const sqrt = Zahlen_Math.sqrt(Zahlen_Math.sub(Zahlen_new(1n), Zahlen_Math.pow(x, new Zahlen_Z(2n))));
            return Zahlen_Math.mul(Zahlen_Math.mul(Zahlen_Math.I, Zahlen_new(-1n)), Zahlen_Math.log(Zahlen_Math.add(ix, sqrt)));
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 逆余弦を返す */
    acos: x => {
        /* ---- Q範囲 : Zahlen_newがnumber→Zahlen_Qをやってくれるので、Math.acosを借りちゃえばOK ---- */
        if (x instanceof Zahlen_Q) return Zahlen_new(Math.acos(Number(x)));
        /* ---- Qi範囲 : acos x = pi/2 - asin x ---- */
        if (x instanceof Zahlen_Qi) return Zahlen_Math.sub(Zahlen_Math.div(Zahlen_Math.PI, Zahlen_new(2n)), Zahlen_Math.asin(x));
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 逆正接を返す */
    atan: x => {
        /* ---- Q範囲 : Zahlen_newがnumber→Zahlen_Qをやってくれるので、Math.atanを借りちゃえばOK ---- */
        if (x instanceof Zahlen_Q) return Zahlen_new(Math.atan(Number(x)));
        /* ---- Qi範囲 : atan x = i/2 * { log( 1-ix ) - log( 1+ix) } ---- */
        if (x instanceof Zahlen_Qi) {
            const ix = Zahlen_Math.mul(Zahlen_Math.I, x);
            const log1 = Zahlen_Math.log(Zahlen_Math.sub(Zahlen_new(1n), ix));
            const log2 = Zahlen_Math.log(Zahlen_Math.add(Zahlen_new(1n), ix));
            return Zahlen_Math.mul(Zahlen_Math.div(Zahlen_Math.I, Zahlen_new(2n)), Zahlen_Math.sub(log1, log2));
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(y: Zahlen_Q|Zahlen_Z, x: Zahlen_Q|Zahlen_Z) => Zahlen_Q|Zahlen_Z} - 2つの引数の逆正接を返す */
    atan2: (y, x) => {
        /* ---- Q範囲 : Zahlen_newがnumber→Zahlen_Qをやってくれるので、Math.atan2を借りちゃえばOK ---- */
        if (y instanceof Zahlen_Q && x instanceof Zahlen_Q) return Zahlen_new(Math.atan2(Number(y), Number(x)));
        /* ---- Q範囲外ならエラーを返す ---- */
        throw new TypeError("[Zahlen.js] Zahlen_Math.atan2() can only accept Zahlen_Q( or Zahlen_Z) as arguments");
    },
    /** ======== 双曲線関数・逆双曲線関数 ======== **/
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 双曲線正弦を返す */
    sinh: x => {
        /* ---- Q範囲 : Zahlen_newがnumber→Zahlen_Qをやってくれるので、Math.sinhを借りちゃえばOK ---- */
        if (x instanceof Zahlen_Q) return Zahlen_new(Math.sinh(Number(x)));
        /* ---- Qi範囲 : sinh z = (e^z - e^(-z)) / 2i ---- */
        if (x instanceof Zahlen_Qi) {
            const exp_z = Zahlen_Math.exp(x);
            const exp_minus_z = Zahlen_Math.exp(Zahlen_Math.neg(x));
            const exp_diff = Zahlen_Math.sub(exp_z, exp_minus_z);
            return Zahlen_Math.div(exp_diff, Zahlen_Math.mul(Zahlen_Math.I, Zahlen_new(2n)));
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 双曲線余弦を返す */
    cosh: x => {
        /* ---- Q範囲 : Zahlen_newがnumber→Zahlen_Qをやってくれるので、Math.coshを借りちゃえばOK ---- */
        if (x instanceof Zahlen_Q) return Zahlen_new(Math.cosh(Number(x)));
        /* ---- Qi範囲 : cosh z = (e^z + e^(-z)) / 2i ---- */
        if (x instanceof Zahlen_Qi) {
            const exp_z = Zahlen_Math.exp(x);
            const exp_minus_z = Zahlen_Math.exp(Zahlen_Math.neg(x));
            const exp_sum = Zahlen_Math.add(exp_z, exp_minus_z);
            return Zahlen_Math.div(exp_sum, Zahlen_Math.mul(Zahlen_Math.I, Zahlen_new(2n)));
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 双曲線正接を返す */
    tanh: x => {
        /* ---- Q範囲 : Zahlen_newがnumber→Zahlen_Qをやってくれるので、Math.tanhを借りちゃえばOK ---- */
        if (x instanceof Zahlen_Q) return Zahlen_new(Math.tanh(Number(x)));
        /* ---- Qi範囲 : tanh z = sinh z / cosh z ---- */
        if (x instanceof Zahlen_Qi) {
            const sinh_z = Zahlen_Math.sinh(x);
            const cosh_z = Zahlen_Math.cosh(x);
            return Zahlen_Math.div(sinh_z, cosh_z);
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 逆双曲線正弦を返す */
    asinh: x => {
        /* ---- Q範囲 : Zahlen_newがnumber→Zahlen_Qをやってくれるので、Math.asinhを借りちゃえばOK ---- */
        if (x instanceof Zahlen_Q) return Zahlen_new(Math.asinh(Number(x)));
        /* ---- Qi範囲 : asinh z =  log_e( z + sqrt( z^2 + 1 ) ) ---- */
        if (x instanceof Zahlen_Qi) {
            const sqrt = Zahlen_Math.sqrt(Zahlen_Math.add(Zahlen_Math.pow(x, new Zahlen_Z(2n)), Zahlen_new(1n)));
            return Zahlen_Math.log(Zahlen_Math.add(x, sqrt));
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 逆双曲線余弦を返す */
    acosh: x => {
        /* ---- Q範囲 : Zahlen_newがnumber→Zahlen_Qをやってくれるので、Math.acoshを借りちゃえばOK ---- */
        if (x instanceof Zahlen_Q) return Zahlen_new(Math.acosh(Number(x)));
        /* ---- Qi範囲 : acosh z =  log_e( z + sqrt( z + 1 ) * sqrt( z - 1 ) ) ---- */
        if (x instanceof Zahlen_Qi) {
            const sqrt1 = Zahlen_Math.sqrt(Zahlen_Math.add(x, Zahlen_new(1n)));
            const sqrt2 = Zahlen_Math.sqrt(Zahlen_Math.sub(x, Zahlen_new(1n)));
            const sqrt = Zahlen_Math.mul(sqrt1, sqrt2);
            return Zahlen_Math.log(Zahlen_Math.add(x, sqrt));
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 逆双曲線正接を返す */
    atanh: x => {
        /* ---- Q範囲 : Zahlen_newがnumber→Zahlen_Qをやってくれるので、Math.atanhを借りちゃえばOK ---- */
        if (x instanceof Zahlen_Q) return Zahlen_new(Math.atanh(Number(x)));
        /* ---- Qi範囲 : atanh z =  1/2 * log_e( (1+z)/(1-z) ) ---- */
        if (x instanceof Zahlen_Qi) {
            const z_plus_1 = Zahlen_Math.add(x, Zahlen_new(1n));
            const z_minus_1 = Zahlen_Math.sub(x, Zahlen_new(1n));
            const log = Zahlen_Math.log(Zahlen_Math.div(z_plus_1, z_minus_1));
            return Zahlen_Math.mul(Zahlen_Math.div(Zahlen_new(1n), Zahlen_new(2n)), log);
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** ======== 指数関数・対数関数 ======== **/
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 指数関数(e^x)を返す */
    exp: x => {
        /* ---- Q範囲 : Zahlen_newがnumber→Zahlen_Qをやってくれるので、Math.expを借りちゃえばOK ---- */
        if (x instanceof Zahlen_Q) return Zahlen_new(Math.exp(Number(x)));
        /* ---- Qi範囲 : e^(a+bi) = e^a * (cos b + i sin b) ---- */
        if (x instanceof Zahlen_Qi) {
            const exp_a = Zahlen_Math.exp(x.real);
            const cos_b = Zahlen_Math.cos(x.imag);
            const sin_b = Zahlen_Math.sin(x.imag);
            const i_sin_b = Zahlen_Math.mul(sin_b, Zahlen_Math.I);
            return Zahlen_Math.mul(exp_a, Zahlen_Math.add(cos_b, i_sin_b));
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - exp(x) - 1を返す */
    expm1: x => {
        /* ---- Qi範囲 : Zahlen_Math.exp()を借りて1引けばOK ---- */
        if (x instanceof Zahlen_Qi) return Zahlen_Math.sub(Zahlen_Math.exp(x), Zahlen_new(1));
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 自然対数を返す */
    log: x => {
        /* ---- Q範囲 : Zahlen_newがnumber→Zahlen_Qをやってくれるので、Math.logを借りちゃえばOK ---- */
        if (x instanceof Zahlen_Q) return Zahlen_new(Math.log(Number(x)));
        /* ---- Qi範囲 : Log z = log |z| + i (Arg z) ---- */
        if (x instanceof Zahlen_Qi) {
            const abs_z = Zahlen_Math.abs(x);
            const arg_z = Zahlen_Math.arg(x);
            return Zahlen_Math.add(Zahlen_Math.log(abs_z), Zahlen_Math.mul(arg_z, Zahlen_Math.I));
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - log(1 + x)を返す */
    log1p: x => {
        /* ---- Q範囲 : Zahlen_newがnumber→Zahlen_Qをやってくれるので、Math.log1pを借りちゃえばOK ---- */
        if (x instanceof Zahlen_Q) return Zahlen_new(Math.log1p(Number(x)));
        /* ---- Qi範囲 : Zahlen_Math.log()を借りて1足せばOK ---- */
        if (x instanceof Zahlen_Qi) return Zahlen_Math.log(Zahlen_Math.add(x, Zahlen_new(1)));
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 10を底とする対数を返す */
    log10: x => {
        /* ---- Q範囲 : Zahlen_newがnumber→Zahlen_Qをやってくれるので、Math.log10を借りちゃえばOK ---- */
        if (x instanceof Zahlen_Q) return Zahlen_new(Math.log10(Number(x)));
        /* ---- Q範囲 : たぶん底の変換公式でいいだろ ---- */
        if (x instanceof Zahlen_Qi) {
            const numerator = Zahlen_Math.log(x);
            const denominator = Zahlen_Math.log(Zahlen_new(10));
            return Zahlen_Math.div(numerator, denominator);
        };
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 2を底とする対数を返す */
    log2: x => {
        /* ---- Q範囲 : Zahlen_newがnumber→Zahlen_Qをやってくれるので、Math.log2を借りちゃえばOK ---- */
        if (x instanceof Zahlen_Q) return Zahlen_new(Math.log2(Number(x)));
        /* ---- Q範囲 : たぶん底の変換公式でいいだろ ---- */
        if (x instanceof Zahlen_Qi) {
            const numerator = Zahlen_Math.log(x);
            const denominator = Zahlen_Math.log(Zahlen_new(2));
            return Zahlen_Math.div(numerator, denominator);
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** ======== 冪乗・冪根 ======== **/
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z, y: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - xのy乗を返す */
    pow: (x, y) => {
        /* ---- 1. y = 0 なら固定で 1 を返す ---- */
        if (
            Zahlen_Math.eq(y, new Zahlen_Z(0n))
        ) {
            return Zahlen_new(1);
        }
        /* ---- 2. x = 0 なら固定で 0 を返す ---- */
        if (
            Zahlen_Math.eq(x, new Zahlen_Z(0n))
        ) {
            return Zahlen_new(0);
        }
        /* ---- 3. x∈ℤ かつ y∈ℤ⁺ なら BigInt同士の直接演算にまかせてOK ---- */
        if (
            x instanceof Zahlen_Z
            && y instanceof Zahlen_Z
            && Zahlen_Math.gt(y, new Zahlen_Z(0n))
        ) {
            return Zahlen_new(BigInt(x.Rn) ** BigInt(y.Rn));
        }
        /* ---- 4. x∈ℤ かつ y∈ℤ⁻ なら 1 / (x ^ |y|) になる ---- */
        if (
            x instanceof Zahlen_Z
            && y instanceof Zahlen_Z
            && Zahlen_Math.lt(y, new Zahlen_Z(0n))
        ) {
            return Zahlen_Math.div(new Zahlen_Z(1n), Zahlen_Math.pow(x, Zahlen_Math.abs(y)));
        }
        /* ---- 5. x∈ℚ かつ y∈ℤ なら x.Rn ^ y / x.Rd ^ y になる ---- */
        if (
            x instanceof Zahlen_Q
            && y instanceof Zahlen_Z) {
            return Zahlen_new(new Zahlen_Q(BigInt(x.Rn) ** BigInt(y.Rn), BigInt(x.Rd) ** BigInt(y.Rn)));
        }
        /* ---- 6. x∈ℚ(i) かつ y∈ℤ⁺ なら しょうがないのでfor文で愚直にy回掛け算する ---- */
        if (
            x instanceof Zahlen_Qi
            && y instanceof Zahlen_Z
            && Zahlen_Math.gt(y, new Zahlen_Z(0n))
        ) {
            let result = Zahlen_new(1);
            for (let i = 0n; Zahlen_new(i).gt(y); i += 1n) {
                result = Zahlen_Math.mul(result, x);
            }
            return result;
        }
        /* ---- 7. x∈ℚ(i) かつ y∈ℤ⁻ なら 1 / (x ^ |y|) になる ---- */
        if (
            x instanceof Zahlen_Qi
            && y instanceof Zahlen_Z
            && Zahlen_Math.lt(y, new Zahlen_Z(0n))
        ) {
            return Zahlen_Math.div(new Zahlen_Qi(1n, 1n, 0n, 1n), Zahlen_Math.pow(x, Zahlen_Math.abs(y)));
        }
        /* ---- 8. x∈ℚ⁺ かつ y∈ℚ⁺ なら (x^y.Rn)のy.Rd乗根 になる (有理数の自然数乗根はZahlen_tools.nthRoot()) ---- */
        if (
            x instanceof Zahlen_Q
            && y instanceof Zahlen_Q
            && Zahlen_Math.gt(x, Zahlen_new(0n))
            && Zahlen_Math.gt(y, Zahlen_new(0n))
        ) {
            return Zahlen_tools.nthRoot(Zahlen_Math.pow(x, Zahlen_new(y.Rn)), Zahlen_new(y.Rd));
        }
        /* ---- 9. x∈ℚ⁻ かつ y∈ℚ⁺ かつ y.Rd = 2 なら (|x|^y.Rn)^(1/2)*i になる(らしい) ---- */
        if (
            x instanceof Zahlen_Q
            && y instanceof Zahlen_Q
            && Zahlen_Math.lt(x, Zahlen_new(0n))
            && Zahlen_Math.gt(y, Zahlen_new(0n))
            && Zahlen_Math.eq(Zahlen_new(y.Rd), new Zahlen_Z(2n))
        ) {
            return Zahlen_Math.mul(Zahlen_tools.nthRoot(Zahlen_Math.pow(Zahlen_Math.abs(x), Zahlen_new(y.Rn)), new Zahlen_Z(2n)), Zahlen_Math.I);
        }
        /* ---- 10. x∈ℚ⁻ かつ y∈ℚ⁺ かつ y.Rdが奇数 なら -( (|x|^n)^(1/d) ) になる(らしい) ---- */
        if (
            x instanceof Zahlen_Q
            && y instanceof Zahlen_Q
            && Zahlen_Math.lt(x, Zahlen_new(0n))
            && Zahlen_Math.gt(y, Zahlen_new(0n))
            && Zahlen_Math.eq(Zahlen_Math.mod(y, new Zahlen_Z(2n)), new Zahlen_Z(1n))
        ) {
            return Zahlen_Math.mul(Zahlen_tools.nthRoot(Zahlen_Math.pow(Zahlen_Math.abs(x), Zahlen_new(y.Rn)), Zahlen_new(y.Rd)), Zahlen_new(-1n));
        }
        /* ---- 11. x∈ℚ⁻ かつ y∈ℚ⁺ かつ y.Rdが偶数 なら ……たぶん方法はあるんだろうけど思いつかないので飛ばす ---- */
        if (
            x instanceof Zahlen_Q
            && y instanceof Zahlen_Q
            && Zahlen_Math.lt(x, Zahlen_new(0n))
            && Zahlen_Math.gt(y, Zahlen_new(0n))
            && Zahlen_Math.eq(Zahlen_Math.mod(y, new Zahlen_Z(2n)), new Zahlen_Z(0n))
        ) {
            // throw new Error("[Zahlen.js] Zahlen_Math Negative Base Error (temporary)");
        }
        /* ---- 12. x∈ℚ かつ y∈ℚ⁻ なら 1 / (x ^ |y|) になる  ---- */
        if (
            x instanceof Zahlen_Q
            && y instanceof Zahlen_Q
            && Zahlen_Math.lt(y, Zahlen_new(0n))
        ) {
            return Zahlen_Math.div(Zahlen_new(1n), Zahlen_Math.pow(x, Zahlen_Math.abs(y)));
        }
        /* ---- ↑以外でQi範囲なら牛刀割鶏だが複素数範囲の定義を使います  ---- */
        if (x instanceof Zahlen_Qi && y instanceof Zahlen_Qi) {
            /* pv z^a = e^(a Log z) ※pvは"主値" */
            return Zahlen_Math.exp(Zahlen_Math.mul(y, Zahlen_Math.log(x)));
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 平方根を返す */
    sqrt: x => {
        /* ---- 平方根は1/2乗なので、powを借りる ---- */
        try {
            return Zahlen_Math.pow(x, new Zahlen_Q(1n, 2n));
        } catch (error) {
            throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
        }
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 立方根を返す */
    cbrt: x => {
        /* ---- 立方根は1/3乗なので、powを借りる ---- */
        try {
            return Zahlen_Math.pow(x, new Zahlen_Q(1n, 3n));
        } catch (error) {
            throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
        }
    },
    /** @type {(...values: (Zahlen_Qi|Zahlen_Q|Zahlen_Z)[]) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 引数の平方和の平方根を返す */
    hypot: (...values) => {
        /* ---- Qi範囲 : 各要素の2乗(pow)→合計(reduce)→平方根(sqrt) ---- */
        if (values.every(v => v instanceof Zahlen_Qi)) {
            const squares = values.map(value => Zahlen_Math.pow(value, new Zahlen_Z(2n)));
            const sum = squares.reduce((prev, current) => Zahlen_Math.add(prev, current), new Zahlen_Z(0n));
            return Zahlen_Math.sqrt(sum);
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** ======== 最大・最小 ======== **/
    /** @type {(...values: (Zahlen_Qi|Zahlen_Q|Zahlen_Z)[]) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 引数のうち最大の値を返す */
    max: (...values) => {
        /* ---- Qi範囲 : ltで順番に比較して最大値を返す ---- */
        if (values.every(v => v instanceof Zahlen_Qi)) {
            return values.reduce((prev, current) => Zahlen_Math.lt(prev, current) ? current : prev);
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(...values: (Zahlen_Qi|Zahlen_Q|Zahlen_Z)[]) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 引数のうち最小の値を返す */
    min: (...values) => {
        /* ---- Qi範囲 : gtで順番に比較して最小値を返す ---- */
        if (values.every(v => v instanceof Zahlen_Qi)) {
            return values.reduce((prev, current) => Zahlen_Math.gt(prev, current) ? current : prev);
        }
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /* ======== 複素数関連(Pythonのcomplex型をベースに) ======== */
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 弧度法(ラジアン) → 角度法(度)の変換 */
    degrees: (x) => {
        return Zahlen_Math.mul(x, Zahlen_Math.div(new Zahlen_Z(180n), Zahlen_Math.PI));
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 角度法(度) → 弧度法(ラジアン)の変換 */
    radians: (x) => {
        return Zahlen_Math.mul(x, Zahlen_Math.div(Zahlen_Math.PI, new Zahlen_Z(180n)));
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 複素数の偏角(の主値(-π<y≦π)) */
    arg: x => {
        /* ---- Qi範囲 : atan2をそのまま借りる ---- */
        if (x instanceof Zahlen_Qi) return Zahlen_Math.atan2(x.imag, x.real);
        /* ---- Qi範囲外ならエラーを返す ---- */
        throw new Error("[Zahlen.js] Zahlen_Math Invalid Type Error");
    },
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} - 複素数の偏角(の主値(-π<y≦π)) */
    phase: (...args) => Zahlen_Math.arg(...args),
    /** @type {(x: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => [(Zahlen_Qi|Zahlen_Q|Zahlen_Z), (Zahlen_Qi|Zahlen_Q|Zahlen_Z)]} -  極形式表現を`[絶対値, 偏角]`で返す。`[Zahlen.Math.abs(x), Zahlen.Math.phase(x)]`と等価 */
    polar: (x) => {
        return [Zahlen_Math.abs(x), Zahlen_Math.phase(x)];
    },
    /** @type {(abs: Zahlen_Qi|Zahlen_Q|Zahlen_Z, amp: Zahlen_Qi|Zahlen_Q|Zahlen_Z) => Zahlen_Qi|Zahlen_Q|Zahlen_Z} -  絶対値と偏角からなる複素数の極形式表現を複素数平面形式に変換してZahlen.Qiで返す。`abs * math.cos(amp) + abs * math.sin(amp) * i`と等価 */
    orthogonal: (abs, amp) => {
        return Zahlen_Math.add(
            Zahlen_Math.mul(abs, Zahlen_Math.cos(amp)),
            Zahlen_Math.mul(abs, Zahlen_Math.mul(Zahlen_Math.I, Zahlen_Math.sin(amp)))
        );
    },
};

/**
 * export (module/global両対応)
 */
globalThis.Zahlen = {
    Math: Zahlen_Math,
    new: Zahlen_new,
    Q: Zahlen_Q,
    Qi: Zahlen_Qi,
    Z: Zahlen_Z,
};

/** @description - AXT-AyaKoto/easing.js 各機能 (プライベートプロパティを使いたいのでClassにします) */
const Easing = class Easing {
    /* ======== Private Props ======== */
    /** @type {{types: string[], dirs: string[]}} - 有効なイージング関数の種類と方向 */
    static #validFunctions = {
        "types": ["Linear", "Sine", "Quad", "Cubic", "Quart", "Quint", "Expo", "Circ", "Back"],
        "dirs": ["In", "Out", "InOut", "OutIn"],
    }
    /** @type {(str: string) => boolean} - イージング関数名が有効なものかチェック */
    static #isValidFn(str) {
        // typesとdirsの組み合わせがあるかどうかチェックして返す
        const { type, dir } = this.#getTypeDir(str);
        return this.#validFunctions.types.includes(type) && this.#validFunctions.dirs.includes(dir);
    }
    /** @type {(str: string) => {type: string, dir: string}} - イージング関数名からイージングの種類と方向を取得 */
    static #getTypeDir(str) {
        // 有効かどうか確認する
        if (!this.#isValidFn(str)) {
            return null;
        }
        // 大丈夫そうなら返す
        const [type, dir] = str.split("_");
        return { type, dir };
    }
    /** @type {(type: string, dir: string) => string} - イージングの種類と方向からイージング関数名を取得 */
    static #getFnName(type, dir) {
        // 一旦結合する
        const name = `${type}_${dir}`;
        // 有効かどうか確認する
        if (!this.#isValidFn(name)) {
            return null;
        }
        // 有効なら返す
        return name;
    }
    /** @type {(name: string) => [number, number, number, number]} - 指定された関数の3次ベジェ曲線の制御点の座標を取得([x1, y1, x2, y2]) */
    static #getCtrlPoints(name) {
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
    /** @type {(a: Zahlen_Qi, b: Zahlen_Qi, c: Zahlen_Qi, d: Zahlen_Qi) => Zahlen_Qi[]} - 3次方程式 ax³+bx²+cx+d=0 の解を返します(カルダノの公式) */
    static #cardano(a, b, c, d) {
        /* ==== 中間変数 ==== */
        // A = -(b/3a)
        const A = Zahlen.new(-1).mul(b.div(a.mul(Zahlen.new(3))));
        // ω₊ = -1/2 + √3i
        const omega_plus = Zahlen.new(-0.5).add(Zahlen.Math.sqrt(Zahlen.new(3)).mul(Zahlen.Math.I));
        // ω₋ = -1/2 - √3i
        const omega_minus = Zahlen.new(-0.5).sub(Zahlen.Math.sqrt(Zahlen.new(3)).mul(Zahlen.Math.I));
        // B = -2b³ + 9ab - 27a²d
        const B = Zahlen.new(-2).mul(b.pow(Zahlen.new(3))).add(Zahlen.new(9).mul(a).mul(b)).sub(Zahlen.new(27).mul(a.pow(Zahlen.new(2))).mul(d));
        // C = 3×( 27a²b² - 18abcd + 4b³d + 4ac³ + b²c² )
        const C = Zahlen.new(3).mul(
            Zahlen.new(27).mul(a.pow(Zahlen.new(2))).mul(b.pow(Zahlen.new(2)))
                .sub(Zahlen.new(18).mul(a).mul(b).mul(c).mul(d))
                .add(Zahlen.new(4).mul(b.pow(Zahlen.new(3))).mul(d))
                .add(Zahlen.new(4).mul(a).mul(c.pow(Zahlen.new(3))))
                .add(Zahlen.new(4).mul(b.pow(Zahlen.new(2))).mul(c.pow(Zahlen.new(2))))
        )
        // R₊ = ³√( ( B / 54a³ ) + ( √c / 18a² ) )
        const R_plus = Zahlen.Math.cbrt(B.div(Zahlen.new(54).mul(a.pow(Zahlen.new(2)))).add(Zahlen.Math.sqrt(c).div(Zahlen.new(18).mul(a.pow(Zahlen.new(2))))));
        // R₋ = ³√( ( B / 54a³ ) - ( √c / 18a² ) )
        const R_minus = Zahlen.Math.cbrt(B.div(Zahlen.new(54).mul(a.pow(Zahlen.new(2)))).sub(Zahlen.Math.sqrt(c).div(Zahlen.new(18).mul(a.pow(Zahlen.new(2))))));
        // x₁ = A + R₊ + R₋ , x₂ = A + ω₊R₊ + ω₋R₋ , x₃ = A + ω₋R₊ + ω₊R₋
        const x1 = A.add(R_plus).add(R_minus);
        const x2 = A.add(omega_plus.mul(R_plus)).add(omega_minus.mul(R_minus));
        const x3 = A.add(omega_minus.mul(R_plus)).add(omega_plus.mul(R_minus));
        // 返す
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
        for (const type of this.#validFunctions.types) {
            for (const dir of this.#validFunctions.dirs) {
                list.push(this.#getFnName(type, dir));
            }
        }
        return list;
    }
    /** @type {(fn: string, x: number) => number[]} - 指定された関数で、0〜1の値をイージングした値の候補を返す */
    static convert(fn, x) {
        const ctrlPts = this.#getCtrlPoints(fn);
        const t_nominee = this.#bezier_p2t(x, ctrlPts[0], ctrlPts[2]);
        const y_nominee = t_nominee.map(t => this.#bezier_t2p(t, ctrlPts[1], ctrlPts[3]));
        return y_nominee;
    }
    /** @type {(fn: string, y: number) => number[]} - yが「指定された関数で0〜1の値をイージングした値」だと仮定して、イージング前のxの値の候補を返す */
    static invert(fn, y) {
        const ctrlPts = this.#getCtrlPoints(fn);
        const t_nominee = this.#bezier_p2t(y, ctrlPts[1], ctrlPts[3]);
        const x_nominee = t_nominee.map(t => this.#bezier_t2p(t, ctrlPts[0], ctrlPts[2]));
        return x_nominee;
    }
}

/** @description - globalThis.Easingに出力 */
globalThis.Easing = Easing;
