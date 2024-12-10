# easing.js

イージングの計算をするライブラリです。

## Installation

- 拙作の[Zahlen.js](https://github.com/AXT-AyaKoto/Zahlen.js)が必要です。
- `script.js`をモジュールとして何らかの方法で読み込んでください
    - CDN : `https://cdn.jsdelivr.net/gh/AXT-AyaKoto/easing.js/script.js`
        - バージョン指定 : `https://cdn.jsdelivr.net/gh/AXT-AyaKoto/easing.js@vX.Y.Z/script.js` 
        - `import "https://cdn.jsdelivr.net/gh/AXT-AyaKoto/easing.js/script.js";`

## Usage

- `Easing` : イージング関数を提供するクラスです
    - Static Properties:
        - `Easing.named_list`: 利用可能なイージング関数の一覧(`String[]`)
    - Static Methods:
        - `Easing.getCtrlPts()`: イージング関数の制御点を取得します
            - Parameters:
                - `name` : イージング関数の名前(`String`)
            - Returns: `number[]` : イージング関数の制御点(`[x1, y1, x2, y2]`)
        - `Easing.convert()`: x→yの変換
            - Parameters:
                - `x`: 変換前の値(`number`)
                - `fn`: イージング関数の名前 or 制御点(`String` or `number[]`)
            - Returns: `number` : 変換後の値
        - `Easing.invert()`: y→xの変換(逆関数)
            - Parameters:
                - `y`: 変換前の値(`number`)
                - `fn`: イージング関数の名前 or 制御点(`String` or `number[]`)
            - Returns: `number` : 変換後の値

---

## License

copyright (c) 2024- Ayasaka-Koto, All rights reserved.

私に不利益が生じたり、公序良俗に反したりしない限り、基本的には自由に使用していただいて構いません。
私が使用を許可したくない場合はその旨ご連絡いたします。その際は速やかに使用を中止していただきますようお願いいたします。
使った際は、私の名前(綾坂こと)をどこかに記載していただけると嬉しいです。

As long as it does not disadvantage me or offend public order, you are free to use it as you wish.
If I do not want you to use it, I will contact you. In that case, please stop using it immediately.
If you do use it, I would appreciate it if you could mention my name ("Ayasaka-Koto") somewhere in it.

コントリビュートによって変更された部分も、著作権は綾坂ことに帰属するものとします。
また、コントリビュートの際は著作者人格権を綾坂ことに行使しないことを約束していただく必要があります。
(コントリビュートを行った時点で、以上の内容に同意したものとみなします。)

The copyright of the parts modified by the contributor shall also belong to Ayasaka-Koto.
When making a contribution, the contributor must promise not to exercise his/her moral rights against Ayasaka-Koto.
(By submitting a contribution, you agree to the above.)
