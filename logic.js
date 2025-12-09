/**
 * データ圧縮アルゴリズム実装
 * Information I - Data Compression Logic
 */

const CompressionLogic = {
  // ==========================================
  // ランレングス圧縮 (RLE)
  // ==========================================
  rle: {
    encode: (text) => {
      if (!text) return { encoded: "", ratio: 0, steps: [] };
      let encoded = "";
      let i = 0;
      const steps = [];
      
      while (i < text.length) {
        let count = 1;
        while (i + count < text.length && text[i] === text[i + count]) {
          count++;
        }
        // 簡易的な表現: 文字 + 数 (例: A5)
        // 実際の実装ではバイナリだが、学習用に見やすくする
        const segment = text[i] + count;
        encoded += segment;
        steps.push({ char: text[i], count: count, output: segment });
        i += count;
      }
      
      const ratio = (encoded.length / text.length) * 100;
      return { encoded, ratio, steps, originalLength: text.length, encodedLength: encoded.length };
    },
    
    decode: (text) => {
      // 形式: A5B3C1 のような 文字+数字 の繰り返しを想定
      // 注意: 数字が2桁以上の場合や、数字自体が文字として含まれる場合の厳密なパースは
      // この簡易実装では複雑になるため、正規表現で簡易パースする
      let decoded = "";
      // 文字(数値以外)の後に数値が続くパターンを検索
      const regex = /([^0-9])([0-9]+)/g;
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        const char = match[1];
        const count = parseInt(match[2], 10);
        decoded += char.repeat(count);
      }
      return decoded;
    },

    getDescription: () => ({
      summary: "連続するデータを「データと個数」のセットに置き換える方式。",
      pros: "同じデータが長く連続する場合（例：白黒画像の背景など）に非常に高い圧縮率を発揮する。",
      cons: "データが連続しない場合（例：文章など）は、逆にデータ量が増えてしまうことがある（「A」→「A1」で2倍）。"
    })
  },

  // ==========================================
  // ハフマン符号化 (Huffman Coding)
  // ==========================================
  huffman: {
    encode: (text) => {
      if (!text) return { encoded: "", ratio: 0, table: [], tree: null };

      // 1. 頻度集計
      const freq = {};
      for (let char of text) {
        freq[char] = (freq[char] || 0) + 1;
      }

      // 2. 優先度付きキュー（ソート済み配列で代用）の作成
      // ノード構造: { char, freq, left, right }
      let queue = Object.keys(freq).map(char => ({ char, freq: freq[char], left: null, right: null }));
      
      // ステップ表示用
      const initialFreqTable = [...queue].sort((a, b) => b.freq - a.freq);

      // 3. ツリー構築
      while (queue.length > 1) {
        queue.sort((a, b) => a.freq - b.freq); // 昇順ソート
        const left = queue.shift();
        const right = queue.shift();
        const newNode = {
          char: null, // 内部ノード
          freq: left.freq + right.freq,
          left,
          right
        };
        queue.push(newNode);
      }
      const root = queue[0];

      // 4. 符号割り当て (再帰探索)
      const codes = {};
      const generateCodes = (node, currentCode) => {
        if (!node) return;
        if (node.char !== null) {
          codes[node.char] = currentCode;
          return;
        }
        generateCodes(node.left, currentCode + "0");
        generateCodes(node.right, currentCode + "1");
      };
      
      // ルートのみの場合（例: "AAAA"）の特例処理
      if (root && root.char !== null) {
         generateCodes(root, "0");
      } else {
         generateCodes(root, "");
      }

      // 5. エンコード
      let encoded = "";
      for (let char of text) {
        encoded += codes[char];
      }

      // ビット長としての計算（Web表示用には01の文字列長をビット数とみなす）
      // 比較用に、元のテキストは 8bit/文字 とする
      const originalBits = text.length * 8;
      const encodedBits = encoded.length; // 0か1の数
      const ratio = (encodedBits / originalBits) * 100;

      // 辞書情報を文字列化して保存（復元用）
      const serializedMap = JSON.stringify(codes);

      return {
        encoded,
        ratio,
        originalLength: originalBits, // bits
        encodedLength: encodedBits, // bits
        map: codes,
        freqTable: initialFreqTable,
        serializedMap
      };
    },

    decode: (encodedText, codeMapJSON) => {
      if (!encodedText || !codeMapJSON) return "復元には辞書情報が必要です。";
      try {
        const codeMap = JSON.parse(codeMapJSON);
        // codeMap: { "A": "0", "B": "101" } -> 逆引きマップを作成
        const reverseMap = {};
        Object.keys(codeMap).forEach(char => {
          reverseMap[codeMap[char]] = char;
        });

        let currentCode = "";
        let decoded = "";
        for (let char of encodedText) {
          currentCode += char;
          if (reverseMap[currentCode]) {
            decoded += reverseMap[currentCode];
            currentCode = "";
          }
        }
        return decoded;
      } catch (e) {
        return "辞書データの解析に失敗しました。";
      }
    },

    getDescription: () => ({
      summary: "出現頻度の高い文字には短いビット列を、低い文字には長いビット列を割り当てる可変長符号化。",
      pros: "データの偏りを利用して効率的に圧縮できる。ZIPやJPEGなど多くの形式の基礎となっている。",
      cons: "復元のために「どのビット列がどの文字か」という対応表（辞書や木構造）も一緒に保存する必要がある。"
    })
  },

  // ==========================================
  // LZW (Lempel-Ziv-Welch)
  // ==========================================
  lzw: {
    encode: (text) => {
      if (!text) return { encoded: "", ratio: 0, steps: [] };

      // 辞書初期化 (ASCIIコード 0-255 を想定)
      // Web表示用にわかりやすくするため、出力はカンマ区切りの数値列とする
      const dict = {};
      for (let i = 0; i < 256; i++) {
        dict[String.fromCharCode(i)] = i;
      }

      let w = "";
      const result = [];
      let dictSize = 256;
      const steps = [];

      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        const wc = w + c;
        if (dict.hasOwnProperty(wc)) {
          w = wc;
        } else {
          result.push(dict[w]);
          steps.push({ w, output: dict[w], add: wc, newCode: dictSize });
          dict[wc] = dictSize++;
          w = String(c);
        }
      }
      if (w !== "") {
        result.push(dict[w]);
        steps.push({ w, output: dict[w], add: "-", newCode: "-" });
      }

      // 結果を文字列化 (例: "65,66,256")
      const encodedStr = result.join(",");
      
      // サイズ計算:
      // 元: 文字数 * 8bit
      // 圧縮後: 数値の個数 * (最大辞書サイズに必要なビット数...簡易的に12bitとする) 
      // ※Webアプリ上の表示としては「数値の配列の長さ」vs「文字数」などで比較するが、
      // ここでは厳密さより「数値の羅列になった」ことの視覚化を優先。
      // 比較指標として、単純に文字列表現の長さで比較するのは不公平なので、
      // (配列要素数 * 12) bits と仮定する。
      const originalBits = text.length * 8;
      const encodedBits = result.length * 12; // 平均的に12bitで収まると仮定
      
      const ratio = (encodedBits / originalBits) * 100;

      return { 
        encoded: encodedStr, 
        ratio, 
        steps, 
        originalLength: originalBits, // bits
        encodedLength: encodedBits, // bits
        isBits: true 
      };
    },

    decode: (text) => {
      if (!text) return "";
      // カンマ区切り数値を配列に変換
      const compressed = text.split(",").map(Number);
      if (compressed.some(isNaN)) return "形式エラー: カンマ区切りの数値（例: 65,66,256）を入力してください";

      // 辞書初期化
      const dict = {};
      for (let i = 0; i < 256; i++) {
        dict[i] = String.fromCharCode(i);
      }

      let w = String.fromCharCode(compressed[0]);
      let result = w;
      let dictSize = 256;

      for (let i = 1; i < compressed.length; i++) {
        const k = compressed[i];
        let entry;
        if (dict.hasOwnProperty(k)) {
          entry = dict[k];
        } else if (k === dictSize) {
          entry = w + w.charAt(0);
        } else {
          return "復元エラー: 無効な辞書コードが含まれています";
        }

        result += entry;
        dict[dictSize++] = w + entry.charAt(0);
        w = entry;
      }
      return result;
    },

    getDescription: () => ({
      summary: "辞書（データベース）を作りながらデータを符号化する方式。事前に辞書を共有する必要がない。",
      pros: "データのパターンを学習しながら圧縮するため、繰り返しパターンの多い長文データに強い。GIFやTIFFで利用。",
      cons: "データ初期段階では辞書が未熟なため圧縮効果が薄い。特許問題（現在は失効）で歴史的な議論があった。"
    })
  }
};

// ブラウザのグローバルスコープに公開
window.CompressionLogic = CompressionLogic;
