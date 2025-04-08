/**
 * ファイル名から年代を抽出する関数（1880-2030の範囲のみ有効）
 */
export function extractYearFromPath(path: string): string {
  // ファイル名から年代を抽出する
  const parts = path.split(/[\/\\]/);
  const fileName = parts[parts.length - 1];
  
  // ファイル名から年代を抽出 (1880-2030の範囲のみ有効)
  const yearMatches = fileName.match(/\b(18[8-9]\d|19\d\d|20[0-2]\d|2030)\b/);
  if (yearMatches && yearMatches[1]) {
    return yearMatches[1];
  }
  
  // 年代の形式 (例: 2020s)
  const decadeMatches = fileName.match(/\b(19\d0s|20[0-2]\ds)\b/);
  if (decadeMatches && decadeMatches[1]) {
    return decadeMatches[1];
  }
  
  return '不明';
}

/**
 * ファイルパスからプロンプト名を抽出する関数
 */
export function extractPromptFromPath(path: string): string {
  // ファイルパスからプロンプト名を抽出
  const parts = path.split(/[\/\\]/);
  const fileName = parts[parts.length - 1];
  
  // 2024_A_full-body_shot_of_a_Thom_Browne_theatrical 形式の場合
  // 年代や先頭文字の後に来るプロンプトを抜き出す
  // 例：2024_A_full-body_shot... → full-body_shot_of_a_Thom_Browne_theatrical
  const promptMatch = fileName.match(/\d{4}_[A-Z]_(.+?)(\.(\w+))?$/);
  if (promptMatch && promptMatch[1]) {
    return promptMatch[1].replace(/_/g, ' ');
  }
  
  // 年代とアンダースコアで区切られた場合
  // 例：2020_prompt_name_1.jpg
  const yearPromptMatch = fileName.match(/\d{4}(?:s)?_([^_]+)/);
  if (yearPromptMatch && yearPromptMatch[1]) {
    return yearPromptMatch[1].replace(/_\d+$/, '');
  }
  
  // *A*などの特定パターンを含む場合
  const specialMatch = fileName.match(/\*([A-Z])\*([^_]+)/);
  if (specialMatch && specialMatch[2]) {
    return `${specialMatch[1]}-style ${specialMatch[2]}`;
  }
  
  // 上記のパターンに一致しない場合はファイル名をそのまま使用
  return fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' '); // 拡張子を除去し、アンダースコアをスペースに置換
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

  // プロンプトを単語に分割してタグとして追加
  const words = prompt.toLowerCase().split(/\s+/);
  words.forEach(word => {
    if (word.length > 2) { // 短すぎる単語は除外
      tags.add(word);
    }
  });

  return Array.from(tags);
}
