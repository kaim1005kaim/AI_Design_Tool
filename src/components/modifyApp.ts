import { groupFilesByPrompt, groupLocalFilesByPrompt, createDesignSetsFromGroups, createLocalDesignSetsFromGroups } from './fileFunctions';

/**
 * App.tsxのloadImagesFromGoogleDrive関数内の修正部分
 * 元のコードの該当部分を以下のコードに置き換える
 */
export const googleDriveLoadingCode = `
// フォルダ内のファイル一覧を取得
const response = await fetch(
  \`https://www.googleapis.com/drive/v3/files?q='\${folderId}'+in+parents+and+mimeType+contains+'image/'&fields=files(id,name,parents,mimeType)&supportsAllDrives=true&includeItemsFromAllDrives=true\`,
  { headers: { Authorization: \`Bearer \${accessToken}\` } }
);

if (!response.ok) throw new Error('ファイル一覧の取得に失敗しました');

const data = await response.json();
const files = data.files || [];

if (files.length === 0) {
  alert('選択したフォルダ内に画像ファイルが見つかりませんでした');
  setIsLoading(false);
  return;
}

// 同じプロンプトの画像をグループ化
const filesByPrompt = groupFilesByPrompt(files);
console.log('プロンプトごとのグループ:', Object.keys(filesByPrompt));

// グループ化されたファイルからDesignSetを作成
const newDesigns = await createDesignSetsFromGroups(filesByPrompt, accessToken);

console.log('読み込まれたデザイン:', newDesigns);
setDesigns(newDesigns);
console.log(\`\${files.length}個の画像ファイルを読み込みました\`);
`;

/**
 * App.tsxのloadImagesFromFolder関数内の修正部分
 */
export const localFileLoadingCode = `
const groupedFilesByPrompt = groupLocalFilesByPrompt(files, fileHandles);
console.log('プロンプトごとのグループ:', Object.keys(groupedFilesByPrompt));

const groupedFiles = createLocalDesignSetsFromGroups(groupedFilesByPrompt);

setDesigns(groupedFiles);
setCurrentFolder(handle.name);
`;
