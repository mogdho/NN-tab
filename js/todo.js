export function initTodo() {
    const todoList = document.getElementById('todo-list');
    const addTodoBtn = document.getElementById('add-todo-btn');
    
    let todos = [];

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

    addTodoBtn.addEventListener('click', () => {
        const text = prompt('Enter a new note:');
        if (text && text.trim() !== '') {
            todos.push(text.trim());
            saveTodos();
            renderTodos();
        }
    });

    loadTodos();
}
