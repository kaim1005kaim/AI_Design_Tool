/**
 * ファイルパスからプロンプト名を抽出する関数
 * 様々なファイル名のパターンに対応
 */
export function extractPromptFromPath(path: string): string {
  // ファイルパスからプロンプト名を抽出
  const parts = path.split(/[\/\\]/);
  const fileName = parts[parts.length - 1];
  
  // ファイル名からプロンプト部分を抽出
  // 例: 3872 - 2024_1.jpg, 3872_2023_2.jpg など
  // 数字部分と年号を除去して、プロンプト部分を取得
  
  // 3872 - 2024 形式の場合
  const dashMatch = fileName.match(/^(\d+)\s*-\s*(\d{4})/);
  if (dashMatch) {
    return dashMatch[1]; // 数字部分(3872など)を返す
  }
  
  // 3872_2024 形式の場合
  const underscoreMatch = fileName.match(/^(\d+)_(\d{4})/);
  if (underscoreMatch) {
    return underscoreMatch[1]; // 数字部分(3872など)を返す
  }
  
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

/**
 * ファイル名から年代を抽出する関数
 */
export function extractYearFromPath(path: string): string {
  // 2020sのような形式や単に2020のような形式も対応
  const yearMatch = path.match(/\d{4}s?/);
  return yearMatch ? yearMatch[0] : '不明';
}

/**
 * プロンプトと年代からタグを生成する関数
 */
export function generateTagsFromPrompt(prompt: string, year: string): string[] {
  const tags = new Set<string>();
  
  if (year !== '不明') {
    tags.add(year);
    tags.add('vintage');
  }

  tags.add(prompt.toLowerCase());

  return Array.from(tags);
}