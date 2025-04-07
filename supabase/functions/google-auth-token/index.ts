// 必要なライブラリをインポート
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// 環境変数から認証情報を取得
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const REDIRECT_URI = Deno.env.get('REDIRECT_URI');

// HTTP サーバーの起動
serve(async (req) => {
  // CORS ヘッダーを設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };

  // OPTIONS リクエスト (プリフライト) の処理
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    // リクエストボディを JSON として解析
    const { code } = await req.json();
    
    // 認証コードの存在確認
    if (!code) {
      return new Response(
        JSON.stringify({ error: '認証コードが見つかりません' }),
        { status: 400, headers }
      );
    }

    console.log(`認証コードを受信: ${code.substring(0, 10)}...`);
    
    // 環境変数の確認
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !REDIRECT_URI) {
      console.error('環境変数が設定されていません');
      return new Response(
        JSON.stringify({ error: '認証に必要な設定が不足しています' }),
        { status: 500, headers }
      );
    }

    // Google API でトークン交換
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    // レスポンスの処理
    const tokenData = await tokenResponse.json();

    if (tokenResponse.ok) {
      console.log('トークンの取得に成功しました');
      return new Response(
        JSON.stringify(tokenData),
        { headers }
      );
    } else {
      console.error('トークン取得エラー:', tokenData);
      return new Response(
        JSON.stringify({ error: 'トークン取得に失敗しました', details: tokenData }),
        { status: 400, headers }
      );
    }
  } catch (error) {
    // エラーハンドリング
    console.error('サーバーエラー:', error);
    return new Response(
      JSON.stringify({ error: 'サーバーエラーが発生しました', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});