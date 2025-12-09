/**
 * データ圧縮学習アプリ React Application
 * Uses Babel Standalone for JSX transformation in browser
 */

const { useState, useEffect, useMemo } = React;

// UI Components
const Card = ({ children, title, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 ${className}`}>
    {title && <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-bold text-gray-700">{title}</div>}
    <div className="p-4">{children}</div>
  </div>
);

const Button = ({ onClick, children, variant = "primary", className = "", disabled = false }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-400",
    success: "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500",
    outline: "border border-gray-300 text-gray-600 hover:bg-gray-50",
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {children}
    </button>
  );
};

// 簡易棒グラフコンポーネント (Rechartsなしで実装)
const SimpleBarChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  
  // 最大値を見つけてスケーリング
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className="w-full space-y-3 mt-4">
      {data.map((d, idx) => (
        <div key={idx} className="flex items-center text-sm">
          <div className="w-24 font-medium text-gray-600 truncate">{d.label}</div>
          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative mx-2">
            <div 
              className={`h-full ${d.color || 'bg-blue-500'} transition-all duration-500`}
              style={{ width: `${Math.max((d.value / maxValue) * 100, 2)}%` }} // 最小幅2%確保
            ></div>
          </div>
          <div className="w-20 text-right font-mono text-gray-700">{d.displayValue}</div>
        </div>
      ))}
      <div className="text-xs text-gray-400 text-right mt-1">※ビット数または文字数換算</div>
    </div>
  );
};

// 画像モード用の8x8グリッドエディタ
const ImageEditor = ({ grid, setGrid }) => {
  const togglePixel = (row, col) => {
    const newGrid = [...grid];
    newGrid[row] = [...newGrid[row]];
    newGrid[row][col] = newGrid[row][col] === 1 ? 0 : 1;
    setGrid(newGrid);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="grid grid-cols-8 gap-1 bg-gray-300 p-1 border rounded">
        {grid.map((row, rIdx) => (
          row.map((cell, cIdx) => (
            <div
              key={`${rIdx}-${cIdx}`}
              onClick={() => togglePixel(rIdx, cIdx)}
              className={`w-6 h-6 sm:w-8 sm:h-8 cursor-pointer border ${cell === 1 ? 'bg-black border-gray-800' : 'bg-white border-gray-200'}`}
            />
          ))
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">クリックして白黒を反転できます</p>
    </div>
  );
};

const App = () => {
  const [activeTab, setActiveTab] = useState("text"); // 'text' | 'image'
  const [algo, setAlgo] = useState("rle");
  
  // テキストモードの状態
  const [inputText, setInputText] = useState("AAAAABBBCCCCC");
  const [compressionResult, setCompressionResult] = useState(null);
  const [decodeInput, setDecodeInput] = useState("");
  const [decodeResult, setDecodeResult] = useState("");
  const [compareData, setCompareData] = useState([]);
  
  // 画像モードの状態 (8x8)
  const [grid, setGrid] = useState(Array(8).fill().map(() => Array(8).fill(0)));
  const [imgResult, setImgResult] = useState(null);

  const logic = window.CompressionLogic;

  // アルゴリズム情報取得
  const algoInfo = useMemo(() => {
    if(!logic || !logic[algo]) return {};
    return logic[algo].getDescription();
  }, [algo]);

  // テキスト圧縮実行
  const handleCompress = () => {
    if (!inputText) return;
    let res = null;

    if (algo === "rle") res = logic.rle.encode(inputText);
    else if (algo === "huffman") res = logic.huffman.encode(inputText);
    else if (algo === "lzw") res = logic.lzw.encode(inputText);

    setCompressionResult(res);
    setDecodeInput(res.encoded); // 自動で復元欄に入力
    setDecodeResult(""); // リセット
  };

  // テキスト復元実行
  const handleDecompress = () => {
    if (!decodeInput) return;
    let res = "";

    if (algo === "rle") {
      res = logic.rle.decode(decodeInput);
    } else if (algo === "huffman") {
      // Huffmanの場合は辞書が必要。直前の圧縮結果を利用するか、警告を出す
      if (compressionResult && compressionResult.serializedMap) {
        res = logic.huffman.decode(decodeInput, compressionResult.serializedMap);
      } else {
        res = "エラー: ハフマン符号化の復元には辞書データが必要です。先に「圧縮」を行ってください。";
      }
    } else if (algo === "lzw") {
      res = logic.lzw.decode(decodeInput);
    }
    setDecodeResult(res);
  };

  // 全アルゴリズム比較
  const handleCompare = () => {
    if (!inputText) return;
    const rleRes = logic.rle.encode(inputText);
    const huffRes = logic.huffman.encode(inputText);
    const lzwRes = logic.lzw.encode(inputText);

    // 比較用に単位を揃える（bit換算）
    // RLE: 簡易実装のため文字長だが、比較のため文字数*8bitとする
    // Huffman: 計算されたビット数
    // LZW: 計算されたビット数
    // 元データ: 文字数 * 8bit

    const originalBits = inputText.length * 8;
    const rleBits = rleRes.encodedLength * 8; // 簡易
    const huffBits = huffRes.encodedLength;
    const lzwBits = lzwRes.encodedLength;

    setCompareData([
      { label: "元データ", value: originalBits, displayValue: `${originalBits} bits`, color: "bg-gray-400" },
      { label: "RLE", value: rleBits, displayValue: `${rleBits} bits`, color: "bg-red-500" },
      { label: "ハフマン", value: huffBits, displayValue: `${huffBits} bits`, color: "bg-green-500" },
      { label: "LZW", value: lzwBits, displayValue: `${lzwBits} bits`, color: "bg-purple-500" }
    ]);
  };

  // 画像圧縮実行
  const handleImageCompress = () => {
    // グリッドを文字列化 (00001111...)
    const flatStr = grid.flat().join("");
    // RLEで圧縮
    const res = logic.rle.encode(flatStr);
    
    // 比較データ作成
    const originalBits = flatStr.length; // 画像は1pixel = 1bitとみなす（白黒）
    // RLE結果は "0414" (0が4つ, 1が4つ) のような文字列。
    // 文字列としては4文字だが、データとしては「数値」と「色」のペア。
    // ここでは教育用に圧縮後データ長(文字数) * 4bit 程度と仮定して比較表示
    const compressedCost = res.encoded.length * 4; 

    setImgResult({
      originalStr: flatStr,
      encoded: res.encoded,
      originalSize: originalBits,
      compressedSize: compressedCost,
      ratio: (compressedCost / originalBits) * 100
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-10">
      {/* ヘッダー */}
      <header className="bg-indigo-600 text-white p-4 shadow-lg sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">データ圧縮体験アプリ</h1>
          <div className="text-xs md:text-sm bg-indigo-700 px-3 py-1 rounded-full opacity-90">情報Ⅰ: データの圧縮</div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 max-w-5xl">
        
        {/* タブ切り替え */}
        <div className="flex space-x-2 mb-6 border-b border-gray-200">
          <button 
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${activeTab === 'text' ? 'bg-white border-x border-t border-gray-200 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('text')}
          >
            テキスト圧縮
          </button>
          <button 
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${activeTab === 'image' ? 'bg-white border-x border-t border-gray-200 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('image')}
          >
            画像圧縮 (RLE体験)
          </button>
        </div>

        {activeTab === 'text' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* メイン操作エリア (左カラム) */}
            <div className="lg:col-span-2 space-y-6">
              {/* 入力設定 */}
              <Card title="1. 入力とアルゴリズム選択">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">アルゴリズム</label>
                    <select 
                      value={algo} 
                      onChange={(e) => { setAlgo(e.target.value); setCompressionResult(null); setDecodeResult(""); setCompareData([]); }}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="rle">ランレングス圧縮 (RLE)</option>
                      <option value="huffman">ハフマン符号化</option>
                      <option value="lzw">LZW圧縮</option>
                    </select>
                    <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
                      <p><span className="font-bold">特徴:</span> {algoInfo.summary}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">圧縮したい文字列 (英数字推奨)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="AAAAABBBCC..."
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                      />
                      <Button onClick={() => setInputText("AAAAABBBCCCCC")}>例1</Button>
                      <Button onClick={() => setInputText("MISSISSIPPI")}>例2</Button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button onClick={handleCompress} variant="primary" className="flex-1">圧縮を実行</Button>
                    <Button onClick={handleCompare} variant="secondary">全アルゴリズム比較</Button>
                  </div>
                </div>
              </Card>

              {/* 圧縮結果 */}
              {compressionResult && (
                <Card title="2. 圧縮結果" className="border-indigo-100 ring-2 ring-indigo-50">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded border">
                        <div className="text-xs text-gray-500 mb-1">圧縮データ</div>
                        <div className="font-mono text-lg font-bold text-indigo-700 break-all">
                          {compressionResult.encoded}
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <div className="text-xs text-gray-500 mb-1">圧縮率 (サイズ比)</div>
                        <div className="font-mono text-lg font-bold text-green-600">
                          {Math.round(compressionResult.ratio)}%
                        </div>
                        <div className="text-xs text-gray-400">
                          {algo === "huffman" || algo === "lzw" ? 
                            `${compressionResult.encodedLength} bits / ${compressionResult.originalLength} bits` : 
                            `${compressionResult.encodedLength} chars / ${compressionResult.originalLength} chars`}
                        </div>
                      </div>
                    </div>

                    {/* ハフマンの場合の辞書表示 */}
                    {algo === "huffman" && (
                      <div className="mt-2 text-sm">
                        <div className="font-bold mb-1">ハフマン符号割り当て (辞書):</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(compressionResult.map).map(([char, code]) => (
                            <span key={char} className="px-2 py-1 bg-gray-100 rounded border border-gray-200 font-mono">
                              {char}: <span className="text-indigo-600 font-bold">{code}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* 比較グラフ */}
              {compareData.length > 0 && (
                <Card title="圧縮率の比較">
                   <p className="text-sm text-gray-600 mb-2">入力: <span className="font-mono font-bold">{inputText}</span></p>
                   <SimpleBarChart data={compareData} />
                   <p className="text-xs text-gray-500 mt-3">
                     ※ データの内容によって、どのアルゴリズムが適しているかが変わります。<br/>
                     例：繰り返しが多い→RLE、文字種が偏っている→ハフマン、長い繰り返しパターンがある→LZW
                   </p>
                </Card>
              )}
            </div>

            {/* サイドエリア (復元・ステップ) */}
            <div className="space-y-6">
              {/* 復元機能 */}
              <Card title="3. 復元の確認">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">圧縮データ入力</label>
                    <textarea 
                      value={decodeInput}
                      onChange={(e) => setDecodeInput(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded text-sm font-mono h-24 resize-none focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                  <Button onClick={handleDecompress} variant="success" className="w-full">
                    復元を実行
                  </Button>
                  
                  {decodeResult && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                      <div className="text-xs text-green-700 font-bold mb-1">復元結果:</div>
                      <div className="font-mono text-lg break-all">{decodeResult}</div>
                      {decodeResult === inputText && (
                        <div className="text-xs text-green-600 mt-1 flex items-center">
                          <span className="mr-1">✓</span> 元通りに戻りました
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* アルゴリズムの解説 */}
              <Card title="アルゴリズムの特徴">
                 <div className="text-sm space-y-3">
                   <div>
                     <span className="block font-bold text-gray-700">得意なデータ</span>
                     <p className="text-gray-600">{algoInfo.pros}</p>
                   </div>
                   <div>
                     <span className="block font-bold text-gray-700">苦手・課題</span>
                     <p className="text-gray-600">{algoInfo.cons}</p>
                   </div>
                 </div>
              </Card>
            </div>

          </div>
        )}

        {/* 画像モード */}
        {activeTab === 'image' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
             <Card title="白黒画像の作成 (8x8)">
                <div className="flex flex-col items-center space-y-4">
                  <ImageEditor grid={grid} setGrid={setGrid} />
                  <div className="flex gap-2 w-full justify-center">
                    <Button onClick={() => setGrid(Array(8).fill().map(() => Array(8).fill(0)))} variant="outline">クリア</Button>
                    <Button onClick={() => setGrid(Array(8).fill().map((_, r) => Array(8).fill(0).map((_, c) => (r+c)%2)))} variant="outline">市松模様</Button>
                    <Button onClick={() => setGrid(Array(8).fill().map((_, r) => Array(8).fill(r < 4 ? 0 : 1)))} variant="outline">上下分割</Button>
                  </div>
                  <Button onClick={handleImageCompress} className="w-full">
                    ランレングス圧縮する
                  </Button>
                </div>
             </Card>

             {imgResult && (
               <Card title="圧縮結果分析">
                 <div className="space-y-4">
                   <div>
                     <div className="text-sm font-bold text-gray-700">ビット列 (元データ):</div>
                     <div className="text-xs font-mono bg-gray-100 p-2 rounded break-all tracking-widest text-gray-500">
                       {imgResult.originalStr}
                     </div>
                   </div>
                   <div>
                     <div className="text-sm font-bold text-indigo-700">RLE圧縮データ:</div>
                     <div className="text-lg font-mono bg-indigo-50 p-2 rounded break-all text-indigo-700 font-bold border border-indigo-200">
                       {imgResult.encoded}
                     </div>
                     <div className="text-xs text-gray-500 mt-1">※「色(0/1) + 連続数」の形式</div>
                   </div>
                   
                   <div className="bg-gray-50 p-4 rounded-lg">
                     <div className="flex justify-between items-end mb-2">
                       <span className="text-sm font-medium">データ量比較</span>
                       <span className="text-2xl font-bold text-gray-800">{Math.round(imgResult.ratio)}%</span>
                     </div>
                     <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
                        <div className="h-full bg-blue-500" style={{ width: `${Math.min(imgResult.ratio, 100)}%` }}></div>
                     </div>
                     <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>圧縮後: {imgResult.compressedSize} (概算)</span>
                        <span>元: {imgResult.originalSize} bits</span>
                     </div>
                   </div>
                   
                   <div className="text-sm bg-yellow-50 p-3 rounded border border-yellow-100 text-yellow-800">
                     <span className="font-bold">考察:</span><br/>
                     {imgResult.ratio < 100 ? 
                       "同じ色が連続しているため、圧縮効果が出ています。FAXなどで利用される原理です。" :
                       "色が頻繁に入れ替わるため、逆にデータ量が増えているか、効果が薄いです（市松模様などで確認しましょう）。"
                     }
                   </div>
                 </div>
               </Card>
             )}
          </div>
        )}

      </main>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
