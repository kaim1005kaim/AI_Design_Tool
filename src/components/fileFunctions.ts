import { extractPromptFromPath, extractYearFromPath, generateTagsFromPrompt } from './extractPromptFromPath';

export interface DesignSet {
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

/**
 * Google Driveからの画像URL取得関数
 */
export async function getImageUrl(fileId: string, accessToken: string): Promise<string | null> {
  try {
    // ファイルの詳細情報を取得
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=thumbnailLink,webContentLink,webViewLink`,
      { 
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        } 
      }
    );

    if (!response.ok) {
      throw new Error('サムネイル情報の取得に失敗しました');
    }

    const fileInfo = await response.json();
    
    // サムネイルリンクや代替リンクを優先的に使用
    return fileInfo.thumbnailLink || 
           fileInfo.webContentLink || 
           fileInfo.webViewLink || 
           `https://drive.google.com/uc?id=${fileId}`;
  } catch (error) {
    console.error('画像URL取得エラー:', error);
    return null;
  }
}

/**
 * ファイルをプロンプトごとにグループ化する関数
 * @param files Google Driveのファイル一覧
 * @returns プロンプトごとにグループ化されたファイル
 */
export function groupFilesByPrompt(files: any[]): { [key: string]: any[] } {
  const filesByPrompt: { [key: string]: any[] } = {};
  
  for (const file of files) {
    const prompt = extractPromptFromPath(file.name);
    if (!filesByPrompt[prompt]) {
      filesByPrompt[prompt] = [];
    }
    filesByPrompt[prompt].push(file);
  }
  
  return filesByPrompt;
}

/**
 * ローカルファイルをプロンプトごとにグループ化する関数
 */
export function groupLocalFilesByPrompt(
  files: string[], 
  fileHandles: FileSystemFileHandle[]
): { [key: string]: {path: string, handle: FileSystemFileHandle}[] } {
  const filesByPrompt: { [key: string]: {path: string, handle: FileSystemFileHandle}[] } = {};
  
  files.forEach((file, index) => {
    const prompt = extractPromptFromPath(file);
    if (!filesByPrompt[prompt]) {
      filesByPrompt[prompt] = [];
    }
    filesByPrompt[prompt].push({path: file, handle: fileHandles[index]});
  });
  
  return filesByPrompt;
}

/**
 * プロンプトグループから4枚ずつのDesignSetを作成する関数
 */
export function createDesignSetsFromGroups(
  filesByPrompt: { [key: string]: any[] },
  accessToken: string
): Promise<DesignSet[]> {
  return new Promise<DesignSet[]>(async (resolve) => {
    const newDesigns: DesignSet[] = [];
    
    // 各プロンプトグループを処理
    for (const prompt in filesByPrompt) {
      const groupFiles = filesByPrompt[prompt];
      // 各グループ内で4枚ずつに分割して処理
      for (let i = 0; i < groupFiles.length; i += 4) {
        const batchFiles = groupFiles.slice(i, i + 4);
        const imagePromises = batchFiles.map(file => 
          getImageUrl(file.id, accessToken)
        );
        
        const images = await Promise.all(imagePromises);
        const validImages = images.filter(img => img !== null) as string[];
        
        if (validImages.length > 0) {
          const file = batchFiles[0];
          const year = extractYearFromPath(file.name);
          
          newDesigns.push({
            id: `design-${newDesigns.length}`,
            year,
            prompt,
            hashtags: generateTagsFromPrompt(prompt, year),
            description: '',
            images: validImages,
            folderPath: file.parents?.[0] || '',
          });
        }
      }
    }
    
    resolve(newDesigns);
  });
}

/**
 * ローカルファイルからDesignSetを作成する関数
 */
export function createLocalDesignSetsFromGroups(
  filesByPrompt: { [key: string]: {path: string, handle: FileSystemFileHandle}[] }
): DesignSet[] {
  const groupedFiles: DesignSet[] = [];
  
  // 各プロンプトグループで4枚ずつに分割
  Object.entries(filesByPrompt).forEach(([prompt, files], groupIndex) => {
    for (let i = 0; i < files.length; i += 4) {
      const batch = files.slice(i, i + 4);
      
      if (batch.length > 0) {
        const year = extractYearFromPath(batch[0].path);
        const folderPath = batch[0].path.substring(0, batch[0].path.lastIndexOf('\\'));
        
        groupedFiles.push({
          id: `design-${groupIndex}-${i/4}`,
          year,
          prompt,
          hashtags: generateTagsFromPrompt(prompt, year),
          description: '',
          images: batch.map(item => item.path),
          folderPath: folderPath,
          fileHandles: batch.map(item => item.handle)
        });
      }
    }
  });
  
  return groupedFiles;
}