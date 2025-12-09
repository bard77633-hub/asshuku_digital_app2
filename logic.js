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
      if (!text) return { encoded: "", ratio: 0, steps: [], animationSteps: [] };
      let encoded = "";
      let i = 0;
      // ステップ表示用（静的リスト）
      const steps = [];
      // アニメーション用（詳細ステップ）
      const animationSteps = [];
      
      while (i < text.length) {
        let count = 1;
        // 連続数を数える
        while (i + count < text.length && text[i] === text[i + count]) {
          count++;
        }
        
        const char = text[i];
        const segment = char + count;
        encoded += segment;
        
        // 静的リスト用
        steps.push({ char, count, output: segment });

        // アニメーション用: 処理中の範囲と結果を記録
        animationSteps.push({
          index: i,
          length: count,
          description: `「${char}」が ${count} 回連続しています`,
          outputChunk: segment,
          currentEncoded: encoded
        });

        i += count;
      }
      
      const ratio = (encoded.length / text.length) * 100;
      return { encoded, ratio, steps, animationSteps, originalLength: text.length, encodedLength: encoded.length };
    },
    
    decode: (text) => {
      let decoded = "";
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
      if (!text) return { encoded: "", ratio: 0, table: [], tree: null, animationSteps: [] };

      // 1. 頻度集計
      const freq = {};
      for (let char of text) {
        freq[char] = (freq[char] || 0) + 1;
      }

      // 2. 優先度付きキュー
      let queue = Object.keys(freq).map(char => ({ char, freq: freq[char], left: null, right: null }));
      const initialFreqTable = [...queue].sort((a, b) => b.freq - a.freq);

      // 3. ツリー構築
      while (queue.length > 1) {
        queue.sort((a, b) => a.freq - b.freq);
        const left = queue.shift();
        const right = queue.shift();
        const newNode = {
          char: null,
          freq: left.freq + right.freq,
          left,
          right
        };
        queue.push(newNode);
      }
      const root = queue[0];

      // 4. 符号割り当て
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
      
      if (root && root.char !== null) {
         generateCodes(root, "0");
      } else {
         generateCodes(root, "");
      }

      // 5. エンコードとアニメーションステップ作成
      let encoded = "";
      const animationSteps = [];
      
      // ステップ0: 辞書構築完了
      animationSteps.push({
        index: -1,
        length: 0,
        description: "頻度を分析し、各文字にビット列を割り当てました（辞書作成）。",
        outputChunk: "",
        currentEncoded: ""
      });

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const code = codes[char];
        encoded += code;

        animationSteps.push({
          index: i,
          length: 1,
          description: `「${char}」を辞書で変換 → ${code}`,
          outputChunk: code,
          currentEncoded: encoded,
          lookupChar: char,
          lookupCode: code
        });
      }

      const originalBits = text.length * 8;
      const encodedBits = encoded.length; 
      const ratio = (encodedBits / originalBits) * 100;
      const serializedMap = JSON.stringify(codes);

      return {
        encoded,
        ratio,
        originalLength: originalBits, 
        encodedLength: encodedBits, 
        map: codes,
        freqTable: initialFreqTable,
        serializedMap,
        animationSteps
      };
    },

    decode: (encodedText, codeMapJSON) => {
      if (!encodedText || !codeMapJSON) return "復元には辞書情報が必要です。";
      try {
        const codeMap = JSON.parse(codeMapJSON);
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
      if (!text) return { encoded: "", ratio: 0, steps: [], animationSteps: [] };

      // 辞書初期化
      const dict = {};
      for (let i = 0; i < 256; i++) {
        dict[String.fromCharCode(i)] = i;
      }

      let w = "";
      const result = [];
      let dictSize = 256;
      const steps = [];
      const animationSteps = [];

      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        const wc = w + c;
        
        if (dict.hasOwnProperty(wc)) {
          // 辞書にある場合：現在のパターン w を拡張
          const prevW = w;
          w = wc;
          animationSteps.push({
            index: i,
            length: 1,
            description: `「${wc}」は辞書にあります。次の文字へ。`,
            w: prevW, // 前の状態
            nextW: wc, // 更新後の状態
            outputChunk: null, // 出力なし
            dictAdd: null
          });
        } else {
          // 辞書にない場合：現在の w を出力し、wc を辞書登録
          result.push(dict[w]);
          const outputCode = dict[w];
          
          steps.push({ w, output: outputCode, add: wc, newCode: dictSize });
          
          animationSteps.push({
            index: i,
            length: 1,
            description: `「${wc}」は辞書にありません。\n1. 「${w}」のコード(${outputCode})を出力\n2. 「${wc}」を辞書(No.${dictSize})に登録\n3. 次の検索開始文字を「${c}」に設定`,
            w: w,
            nextW: c,
            outputChunk: outputCode + ",", // 表示用
            currentEncoded: result.join(","),
            dictAdd: { str: wc, code: dictSize },
            isOutputStep: true
          });

          dict[wc] = dictSize++;
          w = String(c);
        }
      }
      
      if (w !== "") {
        result.push(dict[w]);
        const outputCode = dict[w];
        steps.push({ w, output: outputCode, add: "-", newCode: "-" });
        animationSteps.push({
          index: text.length, // 終了後
          length: 0,
          description: `残っている「${w}」のコード(${outputCode})を出力して終了`,
          w: w,
          nextW: "",
          outputChunk: outputCode,
          currentEncoded: result.join(","),
          dictAdd: null,
          isOutputStep: true
        });
      }

      const encodedStr = result.join(",");
      const originalBits = text.length * 8;
      const encodedBits = result.length * 12; 
      const ratio = (encodedBits / originalBits) * 100;

      return { 
        encoded: encodedStr, 
        ratio, 
        steps, 
        animationSteps,
        originalLength: originalBits, 
        encodedLength: encodedBits, 
        isBits: true 
      };
    },

    decode: (text) => {
      if (!text) return "";
      const compressed = text.split(",").map(Number);
      if (compressed.some(isNaN)) return "形式エラー: カンマ区切りの数値（例: 65,66,256）を入力してください";

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

window.CompressionLogic = CompressionLogic;
