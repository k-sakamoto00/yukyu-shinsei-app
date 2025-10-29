// Firebaseの機能を読み込みます
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// 【重要】Firestoreからデータを取得する機能を追加
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =================================================================
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBJ740xGHLPJBaaggtTCtAJkjlok4FiGsc",
  authDomain: "yukyu-shinsei-app.firebaseapp.com",
  projectId: "yukyu-shinsei-app",
  storageBucket: "yukyu-shinsei-app.firebasestorage.app",
  messagingSenderId: "17998170437",
  appId: "1:17998170437:web:05089288198ac5c5a5162c"
};
// =================================================================

// Firebaseを初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// 【重要】Firestore DBの参照を初期化
const db = getFirestore(app);

// HTMLの要素を取得します
const loginForm = document.getElementById('login-form');
const employeeIdInput = document.getElementById('employee-id');
const passwordInput = document.getElementById('password');
const messageElement = document.getElementById('error-message');

// ログインボタンがクリックされた時の処理
loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); 
    const employeeId = employeeIdInput.value;
    const password = passwordInput.value;
    const email = `${employeeId}@your-company.com`;

    messageElement.textContent = '';
    messageElement.className = '';

    // Firebaseでログイン処理を実行
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // ログイン成功
            messageElement.textContent = 'ログインに成功しました！';
            messageElement.classList.add('success-message');
            
            // 【重要】役割（ロール）をチェックして画面を振り分ける
            checkUserRoleAndRedirect(userCredential.user);
        })
        .catch((error) => {
            // ログイン失敗
            console.error('ログイン失敗:', error.code, error.message);
            if (error.code === 'auth/invalid-credential') {
                messageElement.textContent = '社員番号またはパスワードが間違っています。';
            } else {
                messageElement.textContent = `エラーが発生しました: ${error.code}`;
            }
            messageElement.classList.add('error-message');
        });
});

// 【重要】ユーザーの役割（ロール）をFirestoreから取得し、リダイレクトする関数
async function checkUserRoleAndRedirect(user) {
    try {
        // 'users'コレクションから、ログインしたユーザーのUIDに一致するドキュメントを取得
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            
            // 役割（role）フィールドの値を確認
            if (userData.role === 'admin') {
                // 管理者の場合
                setTimeout(() => { window.location.href = 'admin.html'; }, 1000);
            } else {
                // 一般社員（employee）の場合
                setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
            }
        } else {
            // Firestoreにユーザー情報ドキュメントが存在しない場合
            console.error('ユーザー情報が見つかりません。');
            messageElement.textContent = 'ユーザー情報が登録されていません。';
            messageElement.classList.add('error-message');
        }
    } catch (error) {
        console.error('ロールチェックエラー:', error);
        messageElement.textContent = 'ログイン処理中にエラーが発生しました。';
        messageElement.classList.add('error-message');
    }
}

