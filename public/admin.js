// Firebaseの機能を読み込みます
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, updateDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const db = getFirestore(app);

// HTMLの要素を取得
const logoutButton = document.getElementById('logout-button');
const userInfoDisplay = document.getElementById('user-info-display');
const pendingListBody = document.getElementById('pending-list-body');

// 認証状態の監視
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // ログインしている
        console.log("ログインユーザー検知:", user.uid);
        try {
            const userRole = await checkUserRole(user.uid);
            console.log("ユーザーロール:", userRole);

            if (userRole === 'admin') {
                // 管理者の場合
                userInfoDisplay.textContent = `管理者 (admin) でログイン中`;
                
                // 承認待ちの申請データを読み込む
                loadPendingRequests();

            } else {
                // 一般社員がアクセスしてきた場合
                alert('アクセス権限がありません。ログインページに戻ります。');
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error("ユーザーロールの取得またはその後の処理でエラー:", error);
            alert('ユーザー情報の取得に失敗しました。ログインページに戻ります。');
            window.location.href = 'index.html';
        }
    } else {
        // ログインしていない
        console.log("未認証のため、ログインページにリダイレクトします。");
        // ★ ログアウト時のアラートを削除
        // alert('ログインしていません。ログインページに戻ります。'); 
        window.location.href = 'index.html';
    }
});

// ユーザーの役割（ロール）をFirestoreから取得する関数
async function checkUserRole(uid) {
    try {
        console.log("Firestoreからユーザーロール取得開始:", uid);
        const userDocRef = doc(db, "users", uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            console.log("ドキュメントデータ:", userData);
            console.log("ユーザーロール取得成功:", userData.role);
            return userData.role; // 'admin' または 'employee'
        } else {
            console.warn("Firestoreにユーザーデータが見つかりません:", uid);
            return undefined; // データなし
        }
    } catch (error) {
        console.error("checkUserRoleでFirestoreエラー:", error);
        return undefined; // エラー
    }
}


// ログアウトボタンの処理
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        signOut(auth).catch((error) => {
            // エラー
            console.error('ログアウト失敗:', error);
            alert('ログアウトに失敗しました。');
        });
        // ★ ログアウト後のリダイレクト処理を削除 (onAuthStateChangedに任せる)
    });
}

// 全ユーザーの社員番号と名前のマップを取得する関数
async function loadAllUserNames() {
    const userMap = new Map();
    try {
        const usersCollectionRef = collection(db, "users");
        const querySnapshot = await getDocs(usersCollectionRef);
        querySnapshot.forEach((doc) => {
            const userData = doc.data();
            // ドキュメントID (uid) をキーとして、名前と社員番号を保存
            userMap.set(doc.id, { 
                name: userData.name || '(名前なし)', 
                employeeId: userData.employeeId || '(番号なし)' 
            });
        });
        console.log("全ユーザー名取得完了:", userMap);
        return userMap;
    } catch (error) {
        console.error("全ユーザー名の取得エラー:", error);
        return userMap; // エラーでも空のマップを返す
    }
}

// 承認待ちの申請データを読み込む関数
async function loadPendingRequests() {
    if (!pendingListBody) return; // 要素がなければ何もしない

    // まず全ユーザーの名前マップを取得
    const userMap = await loadAllUserNames();
    
    pendingListBody.innerHTML = ''; // テーブルをクリア

    try {
        const q = query(
            collection(db, "requests"), 
            where("status", "==", "承認待ち"),
            orderBy("createdAt", "asc") // 申請日の古い順
        );
        const querySnapshot = await getDocs(q);

        console.log(`承認待ち申請 ${querySnapshot.size} 件取得`);

        if (querySnapshot.empty) {
            pendingListBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">承認待ちの申請はありません。</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const request = docSnap.data();
            const requestId = docSnap.id;

            // userMap から申請者の情報を取得
            const applicantInfo = userMap.get(request.userId) || { name: '(不明)', employeeId: '(不明)' };
            
            const tr = document.createElement('tr');
            // ★「差し戻し」ボタンを正しく生成
            tr.innerHTML = `
                <td>${formatDate(request.createdAt.toDate())}</td>
                <td>
                    ${applicantInfo.employeeId}
                    <span class="applicant-name">(${applicantInfo.name})</span>
                </td>
                <td>${request.leaveDate}</td>
                <td>${translateLeaveType(request.leaveType)}</td>
                <td>${escapeHTML(request.leaveReason)}</td>
                <td class="action-buttons-cell">
                    <button class="action-button approve-button" data-id="${requestId}">承認</button>
                    <button class="action-button reject-button" data-id="${requestId}">差し戻し</button>
                </td>
            `;
            pendingListBody.appendChild(tr);
        });

        // ボタンにイベントリスナーを追加
        addEventListenersToButtons();

    } catch (error) {
        console.error("承認待ちデータの取得エラー:", error);
        pendingListBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">データの読み込みに失敗しました。</td></tr>';
    }
}

// 承認・差し戻しボタンにイベントリスナーを追加する関数
function addEventListenersToButtons() {
    // 承認ボタン
    document.querySelectorAll('.approve-button').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (confirm("この申請を「承認済み」にしますか？")) {
                await updateRequestStatus(id, "承認済み");
            }
        });
    });

    // 差し戻しボタン
    document.querySelectorAll('.reject-button').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (confirm("この申請を「差し戻し」にしますか？")) {
                await updateRequestStatus(id, "差し戻し");
            }
        });
    });
}

// 申請ステータスを更新する関数
async function updateRequestStatus(id, newStatus) {
    try {
        const requestDocRef = doc(db, "requests", id);
        await updateDoc(requestDocRef, {
            status: newStatus
        });
        console.log(`申請 ${id} を ${newStatus} に更新しました`);
        loadPendingRequests(); // 一覧を再読み込み
    } catch (error) {
        console.error("ステータス更新エラー:", error);
        alert("ステータスの更新に失敗しました。");
    }
}

// ユーティリティ関数
function formatDate(date) {
    // YYYY/MM/DD 形式にフォーマット
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function translateLeaveType(type) {
    // データベースの値 (英語) を日本語に変換
    switch (type) {
        case 'full-day': return '全日';
        case 'half-day-am': return '半日(午前)';
        case 'half-day-pm': return '半日(午後)';
        default: return type;
    }
}

function escapeHTML(str) {
    // 簡単なXSS対策
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(match) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[match];
    });
}

