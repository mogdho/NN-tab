export function initTodo() {
    const todoList = document.getElementById('todo-list');
    const addTodoBtn = document.getElementById('add-todo-btn');
    
    let todos = [];
    let isAdding = false;

    function renderTodos() {
        todoList.innerHTML = '';
        todos.forEach((todo, index) => {
            const li = document.createElement('li');
            li.className = 'todo-item';
            
            const dash = document.createElement('span');
            dash.className = 'dash';
            dash.textContent = '-';
            
            const text = document.createElement('span');
            text.className = 'text';
            text.textContent = todo;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn material-symbols-outlined';
            deleteBtn.textContent = 'check';
            deleteBtn.style.fontSize = '18px';
            deleteBtn.onclick = () => {
                todos.splice(index, 1);
                saveTodos();
                renderTodos();
            };

            li.appendChild(dash);
            li.appendChild(text);
            li.appendChild(deleteBtn);
            todoList.appendChild(li);
        });
    }

    function saveTodos() {
        if (chrome && chrome.storage) {
            chrome.storage.local.set({ todos: todos });
        } else {
            localStorage.setItem('todos', JSON.stringify(todos));
        }
    }

    function loadTodos() {
        if (chrome && chrome.storage) {
            chrome.storage.local.get(['todos'], (result) => {
                if (result.todos) {
                    todos = result.todos;
                    renderTodos();
                }
            });
        } else {
            const stored = localStorage.getItem('todos');
            if (stored) {
                todos = JSON.parse(stored);
                renderTodos();
            }
        }
    }

    function showInlineInput() {
        if (isAdding) return;
        isAdding = true;

        const li = document.createElement('li');
        li.className = 'todo-item';

        const dash = document.createElement('span');
        dash.className = 'dash';
        dash.textContent = '-';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'todo-input-inline';
        input.placeholder = 'Type a new note...';

        function commitInput() {
            const value = input.value.trim();
            if (value) {
                todos.push(value);
                saveTodos();
            }
            isAdding = false;
            renderTodos();
        }

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                commitInput();
            } else if (e.key === 'Escape') {
                isAdding = false;
                renderTodos();
            }
        });

        input.addEventListener('blur', commitInput);

        li.appendChild(dash);
        li.appendChild(input);
        todoList.appendChild(li);

        input.focus();
    }

    addTodoBtn.addEventListener('click', showInlineInput);

    loadTodos();
}
