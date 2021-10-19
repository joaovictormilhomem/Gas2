let requestListCopy = [];
let atualStockCopy = {};
let atualCashCopy = {};
let isHistoryRequestsOn = false;
let cashDay;
let selectedCash = {};

function handleDeleteRequest(requestElement) {
    let id = requestElement.getAttribute('data-id');
    let collection = requestElement.getAttribute('data-collection');
    let p13 = parseInt(requestElement.getAttribute('data-p13'));
    let water = parseInt(requestElement.getAttribute('data-water'));
    let p13Empty = parseInt(requestElement.getAttribute('data-p13Empty'));
    let waterEmpty = parseInt(requestElement.getAttribute('data-waterEmpty'));

    deleteRequest(id, collection);
    handleUpdateStock(p13, water, p13Empty, waterEmpty, false);
}

function handleRenderRequests() {
    if (isHistoryRequestsOn) {
        let requestFinishedTodayList = requestList.filter(isARequestFinishedToday);
        requestFinishedTodayList.forEach(request => renderRequest(request));
    }
    else {
        let requestsNotDeletedOrFinished = requestList.filter(wasNotDeletedOrFinished);
        requestsNotDeletedOrFinished.forEach(request => renderRequest(request));
    }
}

function handleRenderForwards(forwards) {
    let requestsNotDeletedAndIsFinished = forwards.filter(wasNotDeletedAndIsFinished);

    let requestsNotDeletedAndIsFinishedAndSorted = requestsNotDeletedAndIsFinished.sort((a, b) => {
        if (a.data().startTime < b.data().startTime)
            return -1;
        else if (a.data().startTime > b.data().startTime)
            return 1;
        else
            return 0;
    });

    let now = new Date().getTime();
    requestsNotDeletedAndIsFinishedAndSorted.forEach(forward => {
        let difference = Math.abs(now - forward.data().startTime);
        let days = Math.ceil(difference / (1000 * 60 * 60 * 24));
        renderForward(forward, days);
    });
}

function handleNewExpenseClick(value, item, notes) {
    if (value !== '' && value >= 0.1 && !isNaN(value)) {
        createExpense(value, item, notes);
        updateExpenseCashValue(value + atualCash.expense);
    }
    else return 1;
}

function handleCreateRequest(client, address, telephone, items, value, op) {
    items = deleteNaNAndDuplicatedProps(items);
    if (isFilled([address, op, items], value)) {
        if (checkIfThereIsStock(items)) {
            createRequest(client, address, telephone, items, value, op);
            handleUpdateStock(items.p13, items.water, items.p13Empty, items.waterEmpty, true);
            return 0; // Tudo certo
        }
        else
            return 2; // Sem estoque
    }
    else
        return 1; // Não preencheu corretamente
}

function handleChangeRequestStatus(requestElement) {
    let id = requestElement.getAttribute('data-id');
    let collection = requestElement.getAttribute('data-collection');
    let status = requestElement.getAttribute('data-status');
    let value = parseFloat(requestElement.getAttribute('data-value'));
    let op = requestElement.getAttribute('data-cash-op');

    if (status === 'waiting')
        startRequest(id, collection);
    else if (status === 'started') {
        handleUpdateCash(value, op);
        finishRequest(id, collection);
    }
}

function handlePayForward(valueToBePaid, paymentMethod, forward) {
    let remainingValue = forward.data().value - forward.data().paidvalue;
    valueToBePaid = parseFloat(valueToBePaid);
    let finalValue = valueToBePaid + parseFloat(forward.data().paidvalue);

    if (valueToBePaid > 0 && valueToBePaid <= remainingValue && paymentMethod !== '') {
        changeForwardPaidValue(forward.id, finalValue);
        createBackward(forward.id, valueToBePaid, paymentMethod);
        handleUpdateCash(valueToBePaid, paymentMethod);
        return 0;
    }
    else return 1;
}

async function handleUpdateStock(p13, water, p13Empty, waterEmpty, isToDecrease) {
    if (isToDecrease) {
        if (p13 > 0) {
            await updateStockValue('p13', atualStock.p13 - p13);
            await updateStockValue('p13Empty', atualStock.p13Empty + p13);
        }
        if (water > 0) {
            await updateStockValue('water', atualStock.water - water);
            await updateStockValue('waterEmpty', atualStock.waterEmpty + water);
        }
        if (p13Empty > 0) await updateStockValue('p13Empty', atualStock.p13Empty - p13Empty);
        if (waterEmpty > 0) await updateStockValue('waterEmpty', atualStock.waterEmpty - waterEmpty);
    }
    else {
        if (p13 > 0) {
            await updateStockValue('p13', atualStock.p13 + p13);
            await updateStockValue('p13Empty', atualStock.p13Empty - p13);
        }
        if (water > 0) {
            await updateStockValue('water', atualStock.water + water);
            await updateStockValue('waterEmpty', atualStock.waterEmpty - water);
        }
        if (p13Empty > 0) await updateStockValue('p13Empty', atualStock.p13Empty + p13Empty);
        if (waterEmpty > 0) await updateStockValue('waterEmpty', atualStock.waterEmpty + waterEmpty);
    }
}

function handleUpdateCash(value, op) {
    if (atualCash[op] !== undefined)
        atualCash[op] = atualCash[op] + value;
    else
        atualCash[op] = value;
    updateCashValue();
}

function startSearch() {
    let forwardsSearchBar = document.getElementById('forwards_search_bar');

    forwardsSearchBar.onkeyup = () => {
        let value = forwardsSearchBar.value.toLowerCase();
        let forwardsList = requestList.filter(isForward);

        forwardsList = forwardsList.filter((request) => {
            let address = request.data().address.toLowerCase();
            return address.includes(value);
        })

        clearForwards();
        handleRenderForwards(forwardsList);
    }
}

async function start() {
    day = getCurrentDate();
    cashDay = day;
    await startFirebase();
    startNewExpensePopup();
    startNewRequestPopup();
    startNewClientPopup();
    startAddButtons();
    startSearch();

    let autoRenderRequestsAndForwards = setInterval(() => {
        if (requestListCopy !== requestList) {
            requestListCopy = requestList;
            clearRequestsAndForwards();
            handleRenderRequests();
            let forwardsList = requestList.filter(isForward);
            handleRenderForwards(forwardsList);
        }
    }, 500)

    let autoRenderCash = setInterval(() => {
        let dateExists = false;
        cashHistory.forEach(item => {
            if (item.id === cashDay) {
                selectedCash.incash = item.data().incash;
                selectedCash.card = item.data().card;
                selectedCash.pix = item.data().pix;
                selectedCash.forward = item.data().forward;
                selectedCash.expense = item.data().expense;
                selectedCash.incashLessExpense = selectedCash.incash - selectedCash.expense;
                selectedCash.total = selectedCash.incashLessExpense + selectedCash.card + selectedCash.pix;
                dateExists = true;
            }
            if (!dateExists) {
                selectedCash.incash = 'ERRO';
                selectedCash.card = 'ERRO';
                selectedCash.pix = 'ERRO';
                selectedCash.forward = 'ERRO';
                selectedCash.expense = 'ERRO';
                selectedCash.incashLessExpense = 'ERRO';
                selectedCash.total = 'ERRO';
            }
            checkUndefinedCash(selectedCash);
            renderCash(selectedCash);
        });
    }, 500);

    let autoRenderStock = setInterval(() => {
        if (!isEqualObjects(atualStock, atualStockCopy)) {
            atualStockCopy.p13 = atualStock.p13;
            atualStockCopy.water = atualStock.water;
            atualStockCopy.p13Empty = atualStock.p13Empty;
            atualStockCopy.waterEmpty = atualStock.waterEmpty;
            renderStock(atualStockCopy);
        }
    }, 500);
}

start();