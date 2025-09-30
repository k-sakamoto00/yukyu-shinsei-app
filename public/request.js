// Firebaseの機能を読み込みます
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// 【重要】Firestoreの機能を追加で読み込みます
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =================================================================
// 【重要】あなたのFirebaseプロジェクトの設定情報を貼り付けてください
// =================================================================
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

// Firebaseを初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Firestoreのインスタンスを取得

// HTML要素の取得
const userInfoDisplay = document.getElementById('user-info-display');
const logoutButton = document.getElementById('logout-button');
const requestForm = document.getElementById('request-form');
const backButton = document.getElementById('back-button');
const messageArea = document.getElementById('message-area');

// ユーザーのログイン状態を監視
onAuthStateChanged(auth, (user) => {
    if (user) {
        // ログインしている場合
        const employeeId = user.email.split('@')[0];
        userInfoDisplay.textContent = `社員番号: ${employeeId}`;

    } else {
        // ログインしていない場合、ログインページに戻す
        window.location.href = 'index.html';
    }
});

// ログアウトボタンの処理
logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('ログアウトエラー', error);
    });
});

// 戻るボタンの処理
backButton.addEventListener('click', () => {
    window.location.href = 'dashboard.html';
});

// 申請フォームが送信された時の処理
requestForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // デフォルトの送信動作を防ぐ

    // 現在のログインユーザーを取得
    const user = auth.currentUser;
    if (!user) {
        alert('ログインしていません。');
        return;
    }

    // フォームから値を取得
    const leaveDate = document.getElementById('leave-date').value;
    const leaveType = document.getElementById('leave-type').value;
    const leaveReason = document.getElementById('leave-reason').value;

    try {
        // Firestoreの'requests'コレクションに新しいドキュメントを追加
        const docRef = await addDoc(collection(db, "requests"), {
            userId: user.uid, // ログインしているユーザーのID
            employeeId: user.email.split('@')[0], // 社員番号
            leaveDate: leaveDate,       // 休暇取得日
            leaveType: leaveType,       // 休暇種別
            leaveReason: leaveReason,   // 申請理由
            status: '承認待ち',         // 初期ステータス
            createdAt: serverTimestamp() // サーバーのタイムスタンプ
        });
        
        console.log("Document written with ID: ", docRef.id);
        messageArea.textContent = '申請が完了しました。';
        messageArea.style.color = 'green';

        // 成功後、2秒でダッシュボードに戻る
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);

    } catch (error) {
        console.error("Error adding document: ", error);
        messageArea.textContent = '申請中にエラーが発生しました。';
        messageArea.style.color = 'red';
    }
});
