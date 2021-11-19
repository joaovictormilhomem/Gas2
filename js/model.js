let requestList = [];
let atualStock = {};
let atualCash = {};
let cashHistory = {};
let day;

// Firebase
let db;
let auth;

function startFirebase() {
    return new Promise(resolve => {
        const firebaseConfig = {
            apiKey: "AIzaSyDq48j5uf5OWCChZp8WfsEs5-41mc7HHY4",
            authDomain: "jgas-94bed.firebaseapp.com",
            projectId: "jgas-94bed",
            storageBucket: "jgas-94bed.appspot.com",
            messagingSenderId: "606477017238",
            appId: "1:606477017238:web:7c7d54667db0fe146ce2b7",
            measurementId: "G-2STVC1E1DG"
        };
        const firebaseConfigTest = {
            apiKey: "AIzaSyABSsEu7ZB_EL9x1JjsZ-LtzLdY26-3huY",
            authDomain: "testes-c2530.firebaseapp.com",
            projectId: "testes-c2530",
            storageBucket: "testes-c2530.appspot.com",
            messagingSenderId: "940440141576",
            appId: "1:940440141576:web:f56f9802ada74cd7d8b6bd"
        };

        firebase.initializeApp(firebaseConfigTest);
        firebase.analytics();
        
        db   = firebase.firestore()
        auth = firebase.auth();

        let loginIsDone = login('teste@teste.com','123123');
        startLookingForChanges();
        resolve(loginIsDone);
    })
}

function startLookingForChanges() {
    let handleListenerRequests = db.collection('requests').onSnapshot((collection) => {
        requestList = collection.docs;
    })

    let handleListenerStock = db.collection('stock').onSnapshot((collection) => {
        collection.docs.forEach(item => {
            atualStock[item.id] = item.data().number;
        });
    })

    let handleListenerCash = db.collection('cash').onSnapshot((collection) => {
        cashHistory = collection.docs;
        collection.docs.forEach(item => {
            if (item.id === day) {
                atualCash.incash = item.data().incash;
                atualCash.card = item.data().card;
                atualCash.pix = item.data().pix;
                atualCash.forward = item.data().forward;
                atualCash.expense = item.data().expense;
                atualCash.incashLessExpense = atualCash.incash - atualCash.expense;
                atualCash.total = atualCash.incashLessExpense + atualCash.card + atualCash.pix;
            }
            checkUndefinedCash(atualCash);
        })
    })
}

function createBackward(id, value, paymentMethod){
    let now = new Date().valueOf();
    db.collection('backwards').add({
        forward: id,
        when: now,
        value: value,
        op: paymentMethod
    }).then((doc)=>{
    }).catch(err=>{
        console.log(err);
    })
}

function changeForwardPaidValue(id, paidValue) {
    db.collection('requests').doc(id).update({
        paidvalue: paidValue
    }).then(() => {
    }).catch(error => {
        console.log(error);
    })
}

function changeForwardPaidValueAndOp(id, paidValue, op) {
    db.collection('requests').doc(id).update({
        paidvalue: paidValue,
        op: op
    }).then(() => {
    }).catch(error => {
        console.log(error);
    })
}

function createExpense(value, item, notes){
    let now = new Date().valueOf();
    db.collection('expenses').add({
        item: item,
        notes: notes,
        createTime: now,
        value: value
    }).then((doc)=>{
    }).catch(err=>{
        console.log(err);
    })
}

function updateExpenseCashValue(value) {
    let day = getCurrentDate();
    db.collection('cash').doc(day).set({
        expense: value
    }, { merge: true }).then(() => {
    }).catch(error => {
        console.log(error);
    })
}

function createRequest(customer, address, telephone, items, value, op) {
    let now = new Date().valueOf();
    let paidValue = value;
    if (op === 'forward') paidValue = 0;

    db.collection('requests').add({
        customer: customer,
        address: address,
        telephone: telephone,
        items: items,
        status: 'waiting',
        startTime: now,
        value: value,
        paidvalue: paidValue,
        op: op
    }).then((doc)=>{
    }).catch(err=>{
        console.log(err);
    })
}

function deleteRequest(id, collection) {
    let now = new Date().valueOf();
    db.collection(collection).doc(id).update({
        status: "deleted",
        //controller: auth.currentUser.email,
        EndValidationTime: now
    }).then(() => {
    }).catch(error => {
        console.log(error);
    })
}

function startRequest(id, collection) {
    let now = new Date().valueOf();
    db.collection(collection).doc(id).update({
        status: "started",
        //initiator: auth.currentUser.email,
        deliveryStartTime: now
    }).then(() => {
    }).catch(error => {
        console.log(error);
    })
}

function finishRequest(id, collection) {
    let now = new Date().valueOf();
    db.collection(collection).doc(id).update({
        status: "finished",
        //initiator: auth.currentUser.email,
        deliveryStartTime: now
    }).then(() => {
    }).catch(error => {
        console.log(error);
    })
}

function createClient(name, address, birthday, phone) {
    let now = new Date().valueOf();
    db.collection('clients').add({
        name: name,
        address: address,
        birthday: birthday,
        phone: phone,
        status: 'active',
        startTime: now
    }).then((doc)=>{
    }).catch(err=>{
        console.log(err);
    })
}

function deleteClient(id, collection) {
    let now = new Date().valueOf();
    db.collection(collection).doc(id).update({
        status: 'deleted',
        //controller: auth.currentUser.email,
        deleteTime: now
    }).then(() => {
    }).catch(error => {
        console.log(error);
    })
}

function updateStockValue(item, value) {
    return new Promise(resolve => {
        db.collection('stock').doc(item).update({
            number: value
        }).then(() => {
            resolve(true);
        }).catch(error => {
            console.log(error);
            reject(error);
        })
    })
}

function updateCashValue() {
    db.collection('cash').doc(day).set({
        incash: atualCash.incash,
        card: atualCash.card,
        pix: atualCash.pix,
        forward: atualCash.forward,
        expense: atualCash.expense
    }).then(() => {
    }).catch(error => {
        console.log(error);
    })
}

function login(email,password) {
    return new Promise(resolve => {
        auth.signInWithEmailAndPassword(email, password)
        .then((user) => {
            resolve(true);
        })
        .catch((error) => {
            console.log(error);
        });
    })
}

// Logic

function isARequestFinishedToday(request) {
    return (shortDate(request.data().startTime) === shortDate(new Date()) && request.data().status === 'finished');
}

function wasNotDeletedAndIsFinished(request) {
    return request.data().status !== 'deleted' && request.data().status === 'finished';
}

function wasNotDeletedOrFinished(request) { 
    return request.data().status !== 'deleted' && request.data().status !== 'finished';
}

function isFilled(stringsAndObjects, value) {
    filled = true;

    stringsAndObjects.forEach(item => {
        if (item === '' || item === null || item === undefined || JSON.stringify(item) === JSON.stringify({})){
            filled = false;
        }
    });

    if (isNaN(value)) filled = false;

    return filled;
}

function isForward(request) {
    return request.data().value > request.data().paidvalue;
}

function getCurrentDate() {
    let day = new Date;
    return (day.getDate()) + '-' + (day.getMonth()+1) + '-' + day.getFullYear();
}

function shortDate(timestamp) {
    let date = new Date(timestamp);
    let dateString = date.getDate()+'/'+(date.getMonth() + 1)+'/'+date.getFullYear(); //+' '+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds();
    return dateString;
}

function checkUndefinedCash(cash) {
    keys = ['incash', 'card', 'pix', 'forward', 'expense', 'total', 'incashLessExpense'];

    keys.forEach(key => {
        if(cash[key] === undefined || isNaN(cash[key]))
            cash[key] = 0;
    });
}

function isEqualObjects(object1, object2) {
    return JSON.stringify(object1) === JSON.stringify(object2);
}

function deleteNaNAndDuplicatedProps(obj) {
    let newObj = {};
    let firsProp;
    for(const prop in obj) {
        if (!isNaN(obj[prop]) && obj[prop] !== firsProp) {
            if (obj[prop] > 0) newObj[prop] = obj[prop];
        }
        firsProp = prop;
    }
    return newObj;
}

function checkIfThereIsStock(items) {
    for(const item in items) {
        if (atualStock[item] < items[item]) {
            return false;
        }
    }
    return true;
}