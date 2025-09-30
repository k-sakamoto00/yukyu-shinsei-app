// Firebaseの機能を読み込みます
// 【ポイント】最新のバージョン(v10系)を利用するように更新しました
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// =================================================================
// ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓
//
//  【最重要】この下の const firebaseConfig = { ... }; の部分を、
//  Firebaseコンソールからコピーした、あなた自身の正しい設定情報で
//  まるごと上書きしてください。
//
// ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑

/*
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
*/

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBJ740xGHLPJBaaggtTCtAJkjlok4FiGsc",
  authDomain: "yukyu-shinsei-app.firebaseapp.com",
  projectId: "yukyu-shinsei-app",
  storageBucket: "yukyu-shinsei-app.firebasestorage.app",
  messagingSenderId: "17998170437",
  appId: "1:17998170437:web:05089288198ac5c5a5162c"
};

// Firebaseを初期化します
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// HTMLの要素を取得します
const loginForm = document.getElementById('login-form');
const employeeIdInput = document.getElementById('employee-id');
const passwordInput = document.getElementById('password');
const messageElement = document.getElementById('error-message');

// ログインボタンがクリックされた時の処理
loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); // ページの再読み込みを防ぎます

    // 入力された値を取得
    const employeeId = employeeIdInput.value;
    const password = passwordInput.value;

    // 社員番号をメールアドレス形式に変換
    const email = `${employeeId}@your-company.com`;

    // メッセージをリセット
    messageElement.textContent = '';
    messageElement.className = '';

    // Firebaseでログイン処理を実行
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // ログイン成功時の処理
            console.log('ログイン成功:', userCredential.user);
            messageElement.textContent = 'ログインに成功しました！';
            messageElement.classList.add('success-message');
            // 成功後、1.5秒でダッシュボード画面に移動（今はまだ画面がないのでコメントアウト）
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
        })
        .catch((error) => {
            // ログイン失敗時の処理
            console.error('ログイン失敗:', error.code, error.message);
            // v9以降、ユーザーが見つからない/パスワードが違うエラーは 'auth/invalid-credential' に統合されました
            if (error.code === 'auth/invalid-credential') {
                messageElement.textContent = '社員番号またはパスワードが間違っています。';
            } else {
                messageElement.textContent = `エラーが発生しました: ${error.code}`;
            }
            messageElement.classList.add('error-message');
        });
});

