import React, { useState, useEffect } from 'react';
import { Search, Grid2X2, List, FolderOpen, RefreshCw, Plus, X, Save, Image as ImageIcon, X as CloseIcon, FolderSearch } from 'lucide-react';

interface DesignSet {
  id: string;
  year: string;
  prompt: string;
  hashtags: string[];
  description: string;
  images: string[];
  folderPath: string;
  lastSaved?: Date;
  fileHandles?: FileSystemFileHandle[];
}

const placeholderDesigns: DesignSet[] = Array(6).fill(null).map((_, i) => ({
  id: `placeholder-${i}`,
  year: '----',
  prompt: 'デザインのタイトル',
  hashtags: ['タグ1', 'タグ2'],
  description: '',
  images: [],
  folderPath: '',
}));

function extractYearFromPath(path: string): string {
  // ファイル名から年代を抽出する
  // 2020sのような形式や単に2020のような形式も対応
  const yearMatch = path.match(/\d{4}s?/);
  return yearMatch ? yearMatch[0] : '不明';
}

function extractPromptFromPath(path: string): string {
  // ファイルパスからプロンプト名を抽出
  const parts = path.split(/[/\\]/);
  const fileName = parts[parts.length - 1];
  
  // 年代の後に_で区切られた部分を抽出
  // 2020s_promptname_1.jpg のような形式を想定
  const match = fileName.match(/\d{4}s?_([^_]+)/);
  if (match && match[1]) {
    return match[1].replace(/_\d+$/, '');
  }
  
  // *A*などの特定パターンを含む場合
  const specialMatch = fileName.match(/\*([A-Z])\*([^_]+)/);
  if (specialMatch && specialMatch[2]) {
    return `${specialMatch[1]}-style ${specialMatch[2]}`;
  }
  
  // 上記のパターンに一致しない場合はファイル名をそのまま使用
  return fileName.replace(/\.[^/.]+$/, ''); // 拡張子を除去
}

function generateTagsFromPrompt(prompt: string, year: string): string[] {
  const tags = new Set<string>();
  
  if (year !== '不明') {
    tags.add(year);
    tags.add('vintage');
  }

  tags.add(prompt.toLowerCase());

  return Array.from(tags);
}

interface DesignModalProps {
  design: DesignSet;
  onClose: () => void;
  onSaveDescription: (id: string) => void;
  onDescriptionEdit: (id: string, description: string) => void;
  onAddTag: (id: string, tag: string) => void;
  onRemoveTag: (id: string, tag: string) => void;
  savedStatus: { [key: string]: boolean };
}

function DesignModal({
  design,
  onClose,
  onSaveDescription,
  onDescriptionEdit,
  onAddTag,
  onRemoveTag,
  savedStatus
}: DesignModalProps) {
  const [newTag, setNewTag] = useState('');

  const handleOpenInExplorer = async () => {
    try {
      // Google Driveの画像の場合
      if (design.folderPath && design.images[0].includes('drive.google.com')) {
        // Google Driveでのフォルダ表示
        const folderId = design.folderPath;
        const driveUrl = `https://drive.google.com/drive/folders/${folderId}`;
        window.open(driveUrl, '_blank');
        return;
      }
      
      // ローカルファイルの場合
      if (!design.fileHandles || design.fileHandles.length === 0) {
        throw new Error('ファイルハンドルが見つかりません');
      }

      const handles = design.fileHandles;
      if ('showInFolder' in handles[0]) {
        // File System Access APIのshowInFolder機能を使用
        // 全てのファイルを選択した状態で表示するため、一つずつ開く
        for (const handle of handles) {
          if ('showInFolder' in handle) {
            await (handle as any).showInFolder();
          }
        }
      } else {
        throw new Error('このブラウザではエクスプローラーでの選択機能がサポートされていません');
      }
    } catch (error) {
      console.error('エクスプローラーでの選択中にエラーが発生しました:', error);
      alert(error instanceof Error ? error.message : 'エクスプローラーでの選択中にエラーが発生しました。');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            <span className="text-blue-500">{design.year}</span> - {design.prompt}
          </h2>
          <div className="flex items-center space-x-2">
            <button
            onClick={handleOpenInExplorer}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center space-x-2 transition-colors"
            disabled={(!design.fileHandles || design.fileHandles.length === 0) && !design.folderPath}
            >
              <FolderSearch size={20} />
              <span>エクスプローラーで選択</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <CloseIcon size={24} />
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            {design.images.length > 0 ? (
              design.images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`デザイン ${index + 1}`}
                  className="w-full h-64 object-cover rounded-lg"
                  onError={(e) => {
                    // 画像読み込みエラー時の代替表示処理を強化
                    console.error(`画像の読み込みに失敗: ${image}`);
                    (e.target as HTMLImageElement).onerror = null;
                    // プレースホルダー画像を使用
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIzY2NiI+44Ky44Op44OI44Kq44K544OI44Op44OTPC90ZXh0Pjwvc3ZnPg==';
                  }}
                />
              ))
            ) : (
              Array(4).fill(null).map((_, index) => (
                <div
                  key={index}
                  className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center"
                >
                  <ImageIcon size={32} className="text-gray-400" />
                </div>
              ))
            )}
          </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">詳細情報</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                  {design.year}
                </span>
                <span>4枚組</span>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">説明</h3>
              <div className="relative">
                <textarea
                  className="w-full p-3 border rounded-lg text-sm pr-10 min-h-[100px]"
                  value={design.description}
                  onChange={(e) => onDescriptionEdit(design.id, e.target.value)}
                  placeholder="説明を入力..."
                  disabled={design.id.startsWith('placeholder-')}
                />
                <button
                  onClick={() => onSaveDescription(design.id)}
                  className="absolute right-2 top-2 p-1 rounded hover:bg-gray-100"
                  title="保存"
                  disabled={design.id.startsWith('placeholder-')}
                >
                  <Save size={16} className={savedStatus[design.id] ? 'text-green-500' : 'text-gray-400'} />
                </button>
              </div>
              {design.lastSaved && (
                <p className="text-xs text-gray-500 mt-1">
                  最終保存: {new Date(design.lastSaved).toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">タグ</h3>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {design.hashtags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-600 flex items-center group"
                    >
                      #{tag}
                      {!design.id.startsWith('placeholder-') && (
                        <button
                          onClick={() => onRemoveTag(design.id, tag)}
                          className="ml-2 p-1 rounded-full hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {!design.id.startsWith('placeholder-') && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="新しいタグを追加..."
                      className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          onAddTag(design.id, newTag);
                          setNewTag('');
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        onAddTag(design.id, newTag);
                        setNewTag('');
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedYear, setSelectedYear] = useState('全年代');
  const [designs, setDesigns] = useState<DesignSet[]>([]);
  const [currentFolder, setCurrentFolder] = useState('フォルダが選択されていません');
  const [savedStatus, setSavedStatus] = useState<{ [key: string]: boolean }>({});
  const [selectedDesign, setSelectedDesign] = useState<DesignSet | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedDesigns = localStorage.getItem('designs');
    if (savedDesigns) {
      setDesigns(JSON.parse(savedDesigns));
    }

    // Supabase認証情報をローカルストレージに保存
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    localStorage.setItem('supabaseUrl', supabaseUrl);
    localStorage.setItem('supabaseAnonKey', supabaseAnonKey);
  }, []);

  useEffect(() => {
    localStorage.setItem('designs', JSON.stringify(designs));
  }, [designs]);

  const years = ['全年代', ...Array.from(new Set(designs.map(design => {
    const year = parseInt(design.year);
    if (isNaN(year)) return design.year;
    const decade = Math.floor(year / 10) * 10;
    return `${decade}年代`;
  }))).sort()];

  const loadImagesFromGoogleDrive = async () => {
    setIsLoading(true);
    try {
      console.log('Starting Google Drive authentication directly...');
      
      // Google APIのクライアントID
      const clientId = '322366365562-82svpp13lp2mhradli5ku4uvn6ikbeen.apps.googleusercontent.com';
      const redirectUri = 'https://ai-design-tool.netlify.app/auth-callback.html';
      const scope = 'https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/drive.photos.readonly';
      
      // 認証URLを手動で構築
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scope)}` +
        `&access_type=offline` +
        `&prompt=consent`;
      
      console.log('Opening auth window with URL:', authUrl);
      
      // 認証ウィンドウを開く
      const authWindow = window.open(
        authUrl,
        'Google OAuth',
        'width=600,height=800,menubar=no,toolbar=no,location=no,status=no'
      );
      
      if (!authWindow) {
        throw new Error('ポップアップがブロックされました。ポップアップを許可してください。');
      }

      // フォルダ選択のメッセージイベントハンドラを設定
      const handleMessage = async (event: MessageEvent) => {
        if (event.data.type === 'GOOGLE_FOLDER_SELECTED') {
          window.removeEventListener('message', handleMessage);
          const folderId = event.data.folderId;
          const folderName = event.data.folderName;
          const accessToken = event.data.accessToken; // トークンを受け取る
          
          console.log(`フォルダが選択されました: ${folderName}（ID: ${folderId}）`);
          setCurrentFolder(`Google Drive: ${folderName}`);
          
          // 選択されたフォルダ内の画像を取得するAPIを呼び出す
          try {
            // 既にトークンを受け取っているので再利用
            // let accessToken = event.data.accessToken; // 先ほど受け取ったトークンを使用
            
            if (!accessToken) {
              // トークンが無い場合は、再度APIを呼ぶ
              // Supabase Edge Functionで取得するように修正
              const code = new URLSearchParams(authWindow?.location.search).get('code');
              if (!code) throw new Error('認証コードが見つかりません');
              
              const tokenResponse = await fetch('https://sgyfhkqbybvljnvripgs.supabase.co/functions/v1/google-auth-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
              });
              
              if (!tokenResponse.ok) throw new Error('トークンの取得に失敗しました');
              
              const tokenData = await tokenResponse.json();
              accessToken = tokenData.access_token;
            }
            
            // フォルダ内のファイル一覧を取得
            const response = await fetch(
              `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'&fields=files(id,name,parents,mimeType)`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            
            if (!response.ok) throw new Error('ファイル一覧の取得に失敗しました');
            
            const data = await response.json();
            const files = data.files || [];
            
            if (files.length === 0) {
              alert('選択したフォルダ内に画像ファイルが見つかりませんでした');
              setIsLoading(false);
              return;
            }
            
            // 画像ファイルを4枚ずつグループ化してDesignSetを作成
            const newDesigns = files.reduce((acc: DesignSet[], file: any, index: number) => {
              // 年代とプロンプトを抽出
              const year = extractYearFromPath(file.name);
              const prompt = extractPromptFromPath(file.name);
              
              if (index % 4 === 0) {
                // 新しいグループを作成
                acc.push({
                  id: `design-${Math.floor(index / 4)}`,
                  year,
                  prompt,
                  hashtags: generateTagsFromPrompt(prompt, year),
                  description: '',
                  images: [`https://drive.google.com/thumbnail?id=${file.id}&sz=w2000`],
                  folderPath: folderId,
                });
              } else if (acc.length > 0) {
                // 既存のグループに追加
                acc[acc.length - 1].images.push(`https://drive.google.com/thumbnail?id=${file.id}&sz=w2000`);
              }
              return acc;
            }, []);
            
            setDesigns(newDesigns);
            console.log(`${files.length}個の画像ファイルを読み込みました`);
          } catch (error) {
            console.error('Google Drive APIエラー:', error);
            alert(error instanceof Error ? error.message : 'フォルダ内のファイル取得中にエラーが発生しました');
          }
        } else if (event.data.type === 'GOOGLE_FOLDER_CANCELED') {
          window.removeEventListener('message', handleMessage);
          console.log('フォルダ選択がキャンセルされました');
        } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
          window.removeEventListener('message', handleMessage);
          console.error('認証エラー:', event.data.error);
          alert(`認証エラー: ${event.data.error}`);
        }
      };

      window.addEventListener('message', handleMessage);
    } catch (error) {
      console.error('Google Drive error:', error);
      alert(error instanceof Error ? error.message : 'Google Driveからの読み込み中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const loadImagesFromFolder = async () => {
    try {
      if (window.self !== window.top) {
        throw new Error('フォルダ選択機能はiframe内では利用できません。新しいタブで開いてください。');
      }

      if (!('showDirectoryPicker' in window)) {
        throw new Error('お使いのブラウザはフォルダ選択をサポートしていません。');
      }

      const handle = await window.showDirectoryPicker();
      const files: string[] = [];
      const fileHandles: FileSystemFileHandle[] = [];
      
      async function* getFilesRecursively(dirHandle: FileSystemDirectoryHandle): AsyncGenerator<[string, FileSystemFileHandle]> {
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') {
            if (entry.name.toLowerCase().match(/\.(png|jpg|jpeg)$/)) {
              const file = await entry.getFile();
              yield [URL.createObjectURL(file), entry];
            }
          } else if (entry.kind === 'directory') {
            yield* getFilesRecursively(entry);
          }
        }
      }

      for await (const [filePath, fileHandle] of getFilesRecursively(handle)) {
        files.push(filePath);
        fileHandles.push(fileHandle);
      }

      const groupedFiles = files.reduce((acc: DesignSet[], file: string, index: number) => {
        const groupIndex = Math.floor(index / 4);
        const year = extractYearFromPath(file);
        const prompt = extractPromptFromPath(file);
        
        if (index % 4 === 0) {
          acc.push({
            id: `design-${groupIndex}`,
            year,
            prompt,
            hashtags: generateTagsFromPrompt(prompt, year),
            description: '',
            images: [file],
            folderPath: file.substring(0, file.lastIndexOf('\\')),
            fileHandles: [fileHandles[index]]
          });
        } else {
          acc[acc.length - 1].images.push(file);
          acc[acc.length - 1].fileHandles?.push(fileHandles[index]);
        }
        return acc;
      }, []);

      setDesigns(groupedFiles);
      setCurrentFolder(handle.name);
    } catch (error) {
      console.error('フォルダの読み込み中にエラーが発生しました:', error);
      alert(error instanceof Error ? error.message : 'フォルダの読み込み中にエラーが発生しました。');
    }
  };

  const filteredDesigns = designs.filter(design => {
    const matchesSearch = design.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      design.hashtags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (selectedYear === '全年代') return matchesSearch;
    
    const designYear = parseInt(design.year);
    if (isNaN(designYear)) return matchesSearch && design.year === selectedYear;
    
    const designDecade = Math.floor(designYear / 10) * 10;
    return matchesSearch && `${designDecade}年代` === selectedYear;
  });

  const handleDescriptionEdit = (id: string, newDescription: string) => {
    setDesigns(designs.map(design =>
      design.id === id ? { ...design, description: newDescription } : design
    ));
    setSavedStatus(prev => ({ ...prev, [id]: false }));
  };

  const handleSaveDescription = (id: string) => {
    setDesigns(designs.map(design =>
      design.id === id ? { ...design, lastSaved: new Date() } : design
    ));
    setSavedStatus(prev => ({ ...prev, [id]: true }));
    
    setTimeout(() => {
      setSavedStatus(prev => ({ ...prev, [id]: false }));
    }, 3000);
  };

  const handleAddTag = (id: string, tag: string) => {
    if (!tag.trim()) return;
    setDesigns(designs.map(design =>
      design.id === id
        ? { ...design, hashtags: [...new Set([...design.hashtags, tag.trim()])] }
        : design
    ));
  };

  const handleRemoveTag = (id: string, tagToRemove: string) => {
    setDesigns(designs.map(design =>
      design.id === id
        ? { ...design, hashtags: design.hashtags.filter(tag => tag !== tagToRemove) }
        : design
    ));
  };

  const displayDesigns = filteredDesigns.length > 0 ? filteredDesigns : 
    (designs.length === 0 ? placeholderDesigns : []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-500 text-white p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold">AI ファッションデザイン管理ツール</h1>
            <p className="text-sm text-blue-100">現在のフォルダ: {currentFolder}</p>
          </div>
          <div className="flex space-x-2">
            <button
              className="bg-blue-400 hover:bg-blue-600 px-4 py-2 rounded-lg flex items-center space-x-2"
              onClick={loadImagesFromGoogleDrive}
              disabled={isLoading}
            >
              <FolderOpen size={20} />
              <span>Google Driveから読み込む</span>
            </button>
            <button
              className="bg-blue-400 hover:bg-blue-600 px-4 py-2 rounded-lg flex items-center space-x-2"
              onClick={loadImagesFromFolder}
              disabled={isLoading}
            >
              <FolderOpen size={20} />
              <span>ローカルフォルダを選択</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="プロンプトやタグで検索..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-4">
            <select
              className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <div className="flex space-x-2 bg-white rounded-lg border border-gray-200">
              <button
                className={`p-2 rounded-l-lg ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
                onClick={() => setViewMode('grid')}
                title="グリッド表示"
              >
                <Grid2X2 size={20} />
              </button>
              <button
                className={`p-2 rounded-r-lg ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
                onClick={() => setViewMode('list')}
                title="リスト表示"
              >
                <List size={20} />
              </button>
            </div>
            <button
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              onClick={loadImagesFromFolder}
              title="更新"
              disabled={isLoading}
            >
              <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'grid-cols-1 gap-4'}`}>
          {displayDesigns.map(design => (
            <div
              key={design.id}
              className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transform transition-transform hover:scale-[1.02]"
              onClick={() => setSelectedDesign(design)}
            >
              <div className="aspect-w-16 aspect-h-9 relative">
                {design.images.length > 0 ? (
                  <img
                    src={design.images[0]}
                    alt={design.prompt}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      // 画像読み込みエラー時の代替表示処理を強化
                      console.error(`画像の読み込みに失敗: ${design.images[0]}`);
                      (e.target as HTMLImageElement).onerror = null;
                      // プレースホルダー画像を使用
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIzY2NiI+44Ky44Op44OI44Kq44K544OI44Op44OTPC90ZXh0Pjwvc3ZnPg==';
                    }}
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                    <ImageIcon size={32} className="text-gray-400" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-500">{design.year}</span>
                  <span className="text-sm text-gray-500">4枚組</span>
                </div>
                <h3 className="text-lg font-semibold mb-2 line-clamp-1">
                  <span className="text-blue-500">{design.year}</span> - {design.prompt}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {design.hashtags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 rounded-full text-sm text-gray-600"
                    >
                      #{tag}
                    </span>
                  ))}
                  {design.hashtags.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                      +{design.hashtags.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedDesign && (
        <DesignModal
          design={selectedDesign}
          onClose={() => setSelectedDesign(null)}
          onSaveDescription={handleSaveDescription}
          onDescriptionEdit={handleDescriptionEdit}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          savedStatus={savedStatus}
        />
      )}
    </div>
  );
}

export default App;
