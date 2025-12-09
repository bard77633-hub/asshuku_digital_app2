/**
 * データ圧縮学習アプリ React Application
 * Uses Babel Standalone for JSX transformation in browser
 */

const { useState, useEffect, useRef, useMemo } = React;

// UI Components
const Card = ({ children, title, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 ${className}`}>
    {title && <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-bold text-gray-700">{title}</div>}
    <div className="p-4">{children}</div>
  </div>
);

const Button = ({ onClick, children, variant = "primary", className = "", disabled = false, size = "md" }) => {
  const baseStyle = "rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 flex items-center justify-center";
  const sizes = {
    sm: "px-2 py-1 text-sm",
    md: "px-4 py-2",
  };
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-400",
    success: "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500",
    outline: "border border-gray-300 text-gray-600 hover:bg-gray-50",
    ghost: "text-gray-500 hover:bg-gray-100",
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {children}
    </button>
  );
};

// テキスト用 視覚化コンポーネント
const Visualizer = ({ inputText, result, algo }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000); // ms
  const timerRef = useRef(null);

  const steps = result?.animationSteps || [];
  const currentStep = steps[currentStepIndex] || {};

  // 再生制御
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, speed);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, speed, steps.length]);

  // 入力変更やアルゴリズム変更でリセット
  useEffect(() => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [inputText, algo, result]);

  // 入力文字列のハイライト表示
  const renderInputString = () => {
    const chars = inputText.split("");
    return (
      <div className="flex flex-wrap gap-1 font-mono text-lg mb-2 p-2 bg-gray-50 rounded border border-gray-200 overflow-x-auto">
        {chars.map((char, idx) => {
          let bgClass = "bg-white";
          let borderClass = "border-gray-200";
          
          // 現在処理中の文字をハイライト
          const activeIndex = currentStep.index;
          const activeLen = currentStep.length;

          if (activeIndex >= 0 && idx >= activeIndex && idx < activeIndex + activeLen) {
            bgClass = "bg-yellow-100 scale-110 shadow-sm";
            borderClass = "border-yellow-400 font-bold text-black";
          } else if (activeIndex >= 0 && idx < activeIndex) {
            bgClass = "bg-gray-200 text-gray-400"; // 処理済み
          }

          return (
            <div key={idx} className={`w-8 h-8 flex items-center justify-center border rounded transition-all duration-200 ${bgClass} ${borderClass}`}>
              {char}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-indigo-800 flex items-center">
            <span className="mr-2">🔍</span> 圧縮プロセスの可視化
          </h3>
          <div className="flex items-center gap-2">
            <label className="text-xs text-indigo-600 font-medium">速度:</label>
            <input 
              type="range" 
              min="100" 
              max="2000" 
              step="100" 
              value={2100 - speed} 
              onChange={(e) => setSpeed(2100 - Number(e.target.value))}
              className="w-24 h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* コントロールボタン */}
        <div className="flex justify-center gap-2 mb-4">
          <Button onClick={() => setCurrentStepIndex(0)} variant="outline" size="sm" disabled={currentStepIndex === 0}>⏮</Button>
          <Button onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))} variant="outline" size="sm" disabled={currentStepIndex === 0}>◀</Button>
          <Button onClick={() => setIsPlaying(!isPlaying)} variant={isPlaying ? "secondary" : "primary"} size="sm" className="w-24">
            {isPlaying ? "一時停止" : "再生 ▶"}
          </Button>
          <Button onClick={() => setCurrentStepIndex(prev => Math.min(steps.length - 1, prev + 1))} variant="outline" size="sm" disabled={currentStepIndex === steps.length - 1}>▶</Button>
          <Button onClick={() => setCurrentStepIndex(steps.length - 1)} variant="outline" size="sm" disabled={currentStepIndex === steps.length - 1}>⏭</Button>
        </div>

        {/* ステップ進行状況 */}
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-6">
          <div 
            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300" 
            style={{ width: `${((currentStepIndex + 1) / Math.max(steps.length, 1)) * 100}%` }}
          ></div>
        </div>

        {/* 処理内容の視覚化エリア */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 左：入力データのスキャン */}
          <div>
            <div className="text-xs text-gray-500 mb-1 font-bold">1. 入力データの読み取り</div>
            {renderInputString()}
            <div className="min-h-[60px] p-3 bg-white border border-gray-200 rounded text-sm text-gray-700 leading-relaxed whitespace-pre-line shadow-sm">
              {currentStep.description || "開始待ち..."}
            </div>
          </div>

          {/* 右：出力・辞書の状態 */}
          <div className="space-y-4">
             {/* アルゴリズムごとの補足表示 */}
             {algo === 'huffman' && (
                <div className="bg-white p-2 rounded border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1 font-bold">辞書参照</div>
                  {currentStep.lookupChar ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center border bg-gray-50 rounded font-mono">{currentStep.lookupChar}</div>
                      <span className="text-gray-400">➞</span>
                      <div className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{currentStep.lookupCode}</div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 text-center py-2">- 待機中 -</div>
                  )}
                </div>
             )}

             {algo === 'lzw' && (
                <div className="bg-white p-2 rounded border border-gray-200">
                  <div className="text-xs text-gray-500 mb-1 font-bold">辞書登録・検索</div>
                  <div className="text-xs font-mono space-y-1">
                     <div className="flex justify-between">
                       <span>現在のパターン(w):</span>
                       <span className="font-bold bg-yellow-50 px-1">{currentStep.w !== undefined ? `"${currentStep.w}"` : "-"}</span>
                     </div>
                     {currentStep.dictAdd && (
                        <div className="flex justify-between text-indigo-600 font-bold animate-pulse">
                          <span>新規登録:</span>
                          <span>"{currentStep.dictAdd.str}" = {currentStep.dictAdd.code}</span>
                        </div>
                     )}
                  </div>
                </div>
             )}

             {/* 成長する出力データ */}
             <div>
                <div className="text-xs text-gray-500 mb-1 font-bold">2. 出力データ</div>
                <div className="p-2 bg-gray-800 text-green-400 font-mono text-sm rounded h-24 overflow-y-auto break-all shadow-inner">
                  {/* これまで確定した部分 */}
                  <span>{currentStep.currentEncoded ? currentStep.currentEncoded.slice(0, currentStep.currentEncoded.lastIndexOf(currentStep.outputChunk || "xyz")) : ""}</span>
                  {/* 最新の追加部分をハイライト */}
                  {currentStep.outputChunk && (
                    <span className="text-white bg-green-700 px-1 animate-pulse">
                      {currentStep.outputChunk}
                    </span>
                  )}
                  {/* まだの部分は表示しない */}
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// 画像用 視覚化コンポーネント
const ImageVisualizer = ({ grid, result }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500); // 画像は少し速めに
  const timerRef = useRef(null);

  const steps = result?.animationSteps || [];
  const currentStep = steps[currentStepIndex] || {};

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, speed);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, speed, steps.length]);

  useEffect(() => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [result]);

  // ピクセルのステータス判定 (処理済み、処理中、未処理)
  const getPixelStatus = (r, c) => {
    const flatIdx = r * 8 + c;
    const { index, length } = currentStep;
    
    // 開始前
    if (index === undefined) return 'pending';

    if (flatIdx >= index && flatIdx < index + length) return 'active'; // 処理中
    if (flatIdx < index) return 'done'; // 処理済み
    return 'pending'; // 未処理
  };

  return (
    <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100 mb-6">
       <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-indigo-800 flex items-center">
            <span className="mr-2">🎬</span> 画像データのスキャン
          </h3>
          <div className="flex items-center gap-2">
            <label className="text-xs text-indigo-600 font-medium">速度:</label>
            <input 
              type="range" 
              min="100" 
              max="2000" 
              step="100" 
              value={2100 - speed} 
              onChange={(e) => setSpeed(2100 - Number(e.target.value))}
              className="w-24 h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
       </div>

       {/* コントロールボタン */}
       <div className="flex justify-center gap-2 mb-4">
          <Button onClick={() => setCurrentStepIndex(0)} variant="outline" size="sm" disabled={currentStepIndex === 0}>⏮</Button>
          <Button onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))} variant="outline" size="sm" disabled={currentStepIndex === 0}>◀</Button>
          <Button onClick={() => setIsPlaying(!isPlaying)} variant={isPlaying ? "secondary" : "primary"} size="sm" className="w-24">
            {isPlaying ? "一時停止" : "再生 ▶"}
          </Button>
          <Button onClick={() => setCurrentStepIndex(prev => Math.min(steps.length - 1, prev + 1))} variant="outline" size="sm" disabled={currentStepIndex === steps.length - 1}>▶</Button>
          <Button onClick={() => setCurrentStepIndex(steps.length - 1)} variant="outline" size="sm" disabled={currentStepIndex === steps.length - 1}>⏭</Button>
       </div>

       {/* プログレスバー */}
       <div className="w-full bg-gray-200 rounded-full h-1.5 mb-6">
          <div 
            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300" 
            style={{ width: `${((currentStepIndex + 1) / Math.max(steps.length, 1)) * 100}%` }}
          ></div>
        </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
         {/* グリッドビュー */}
         <div className="flex flex-col items-center">
           <div className="text-sm font-bold text-gray-700 mb-2">スキャン中 (左上から右へ)</div>
           <div className="grid grid-cols-8 gap-1 bg-gray-300 p-1 border rounded shadow-sm">
             {grid.map((row, rIdx) => (
               row.map((cell, cIdx) => {
                 const status = getPixelStatus(rIdx, cIdx);
                 let borderClass = "border-gray-200";
                 let ringClass = "";
                 let opacityClass = "";
                 
                 if (status === 'active') {
                   borderClass = "border-yellow-400 z-10";
                   ringClass = "ring-2 ring-yellow-400 ring-offset-1";
                 } else if (status === 'done') {
                   borderClass = "border-indigo-200";
                   opacityClass = "opacity-60"; // 処理済みは少し薄く
                 }

                 return (
                   <div
                     key={`${rIdx}-${cIdx}`}
                     className={`w-6 h-6 sm:w-8 sm:h-8 border ${cell === 1 ? 'bg-black' : 'bg-white'} ${borderClass} ${ringClass} ${opacityClass} transition-all duration-200`}
                   />
                 );
               })
             ))}
           </div>
         </div>

         {/* 情報ビュー */}
         <div className="space-y-4">
            <div className="bg-white p-3 rounded border border-gray-200 shadow-sm min-h-[80px]">
              <div className="text-xs text-gray-500 font-bold mb-1">処理内容</div>
              <div className="text-gray-800 font-medium leading-relaxed">
                 {currentStep.description ? 
                    currentStep.description
                      .replace(/「0」/g, "「白(0)」")
                      .replace(/「1」/g, "「黒(1)」") 
                    : "開始待ち..."}
              </div>
            </div>

            <div className="bg-gray-800 p-3 rounded text-green-400 font-mono text-sm h-40 overflow-y-auto shadow-inner">
               <div className="text-xs text-gray-400 border-b border-gray-700 pb-1 mb-1">出力データ</div>
               <span>{currentStep.currentEncoded ? currentStep.currentEncoded.slice(0, currentStep.currentEncoded.lastIndexOf(currentStep.outputChunk || "xyz")) : ""}</span>
               {currentStep.outputChunk && (
                  <span className="text-white bg-green-700 px-1 animate-pulse">{currentStep.outputChunk}</span>
               )}
            </div>
         </div>
       </div>
    </div>
  );
};


// 簡易棒グラフコンポーネント
const SimpleBarChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const maxValue = Math.max(...data.map(d => d.value));
  return (
    <div className="w-full space-y-3 mt-4">
      {data.map((d, idx) => (
        <div key={idx} className="flex items-center text-sm">
          <div className="w-24 font-medium text-gray-600 truncate">{d.label}</div>
          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative mx-2">
            <div 
              className={`h-full ${d.color || 'bg-blue-500'} transition-all duration-500`}
              style={{ width: `${Math.max((d.value / maxValue) * 100, 2)}%` }}
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
      <div className="grid grid-cols-8 gap-1 bg-gray-300 p-1 border rounded shadow-inner">
        {grid.map((row, rIdx) => (
          row.map((cell, cIdx) => (
            <div
              key={`${rIdx}-${cIdx}`}
              onClick={() => togglePixel(rIdx, cIdx)}
              className={`w-6 h-6 sm:w-8 sm:h-8 cursor-pointer border transition-colors duration-150 ${cell === 1 ? 'bg-black border-gray-800' : 'bg-white border-gray-200 hover:bg-gray-100'}`}
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

  const algoInfo = useMemo(() => {
    if(!logic || !logic[algo]) return {};
    return logic[algo].getDescription();
  }, [algo]);

  // 入力が変わったら結果をリセット
  useEffect(() => {
    setCompressionResult(null);
    setDecodeInput("");
    setDecodeResult("");
    setCompareData([]);
  }, [inputText, algo]);
  
  // 画像グリッドが変わったら結果をリセット
  useEffect(() => {
    setImgResult(null);
  }, [grid]);

  const handleCompress = () => {
    if (!inputText) return;
    let res = null;

    if (algo === "rle") res = logic.rle.encode(inputText);
    else if (algo === "huffman") res = logic.huffman.encode(inputText);
    else if (algo === "lzw") res = logic.lzw.encode(inputText);

    setCompressionResult(res);
    setDecodeInput(res.encoded);
    setDecodeResult("");
  };

  const handleDecompress = () => {
    if (!decodeInput) return;
    let res = "";

    if (algo === "rle") {
      res = logic.rle.decode(decodeInput);
    } else if (algo === "huffman") {
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

  const handleCompare = () => {
    if (!inputText) return;
    const rleRes = logic.rle.encode(inputText);
    const huffRes = logic.huffman.encode(inputText);
    const lzwRes = logic.lzw.encode(inputText);

    const originalBits = inputText.length * 8;
    const rleBits = rleRes.encodedLength * 8; 
    const huffBits = huffRes.encodedLength;
    const lzwBits = lzwRes.encodedLength;

    setCompareData([
      { label: "元データ", value: originalBits, displayValue: `${originalBits} bits`, color: "bg-gray-400" },
      { label: "RLE", value: rleBits, displayValue: `${rleBits} bits`, color: "bg-red-500" },
      { label: "ハフマン", value: huffBits, displayValue: `${huffBits} bits`, color: "bg-green-500" },
      { label: "LZW", value: lzwBits, displayValue: `${lzwBits} bits`, color: "bg-purple-500" }
    ]);
  };

  const handleImageCompress = () => {
    const flatStr = grid.flat().join("");
    const res = logic.rle.encode(flatStr);
    
    const originalBits = flatStr.length; 
    const compressedCost = res.encoded.length * 4; 

    setImgResult({
      originalStr: flatStr,
      encoded: res.encoded,
      originalSize: originalBits,
      compressedSize: compressedCost,
      ratio: (compressedCost / originalBits) * 100,
      animationSteps: res.animationSteps // アニメーション用データを渡す
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-10">
      <header className="bg-indigo-600 text-white p-4 shadow-lg sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">データ圧縮体験アプリ</h1>
          <div className="text-xs md:text-sm bg-indigo-700 px-3 py-1 rounded-full opacity-90">情報Ⅰ: データの圧縮</div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 max-w-5xl">
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
            <div className="lg:col-span-2 space-y-6">
              <Card title="1. 入力とアルゴリズム選択">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">アルゴリズム</label>
                    <select 
                      value={algo} 
                      onChange={(e) => setAlgo(e.target.value)}
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

              {/* ビジュアライザー (圧縮結果があるときのみ表示) */}
              {compressionResult && (
                <Visualizer inputText={inputText} result={compressionResult} algo={algo} />
              )}

              {/* 圧縮結果詳細 */}
              {compressionResult && (
                <Card title="2. 最終結果データ" className="border-indigo-100 ring-2 ring-indigo-50">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded border">
                        <div className="text-xs text-gray-500 mb-1">圧縮データ</div>
                        <div className="font-mono text-lg font-bold text-indigo-700 break-all leading-tight">
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

              {compareData.length > 0 && (
                <Card title="圧縮率の比較">
                   <p className="text-sm text-gray-600 mb-2">入力: <span className="font-mono font-bold">{inputText}</span></p>
                   <SimpleBarChart data={compareData} />
                </Card>
              )}
            </div>

            <div className="space-y-6">
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

        {activeTab === 'image' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
             {/* 左カラム：エディタ */}
             <Card title="白黒画像の作成 (8x8)">
                <div className="flex flex-col items-center space-y-4">
                  <ImageEditor grid={grid} setGrid={setGrid} />
                  <div className="flex gap-2 w-full justify-center">
                    <Button onClick={() => setGrid(Array(8).fill().map(() => Array(8).fill(0)))} variant="outline" size="sm">クリア</Button>
                    <Button onClick={() => setGrid(Array(8).fill().map((_, r) => Array(8).fill(0).map((_, c) => (r+c)%2)))} variant="outline" size="sm">市松模様</Button>
                    <Button onClick={() => setGrid(Array(8).fill().map((_, r) => Array(8).fill(r < 4 ? 0 : 1)))} variant="outline" size="sm">上下分割</Button>
                  </div>
                  <Button onClick={handleImageCompress} className="w-full">
                    ランレングス圧縮する
                  </Button>
                </div>
             </Card>

             {/* 右カラム：結果とビジュアライザー */}
             {imgResult && (
               <div className="space-y-6">
                 {/* 画像用ビジュアライザー */}
                 <ImageVisualizer grid={grid} result={imgResult} />
                 
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
               </div>
             )}
          </div>
        )}

      </main>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
