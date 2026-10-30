import { getItem, setItems } from './storage.js';

export async function initTodo() {
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

            const doneBtn = document.createElement('button');
            doneBtn.className = 'delete-btn material-symbols-outlined';
            doneBtn.textContent = 'check';
            doneBtn.title = 'Mark done';
            doneBtn.style.fontSize = '18px';
            doneBtn.onclick = () => {
                todos.splice(index, 1);
                saveTodos();
                renderTodos();
            };

            li.append(dash, text, doneBtn);
            todoList.appendChild(li);
        });
    }

    function saveTodos() {
        setItems({ todos });
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

        // Re-rendering removes the input, which can fire `blur`. The flag makes
        // sure Enter adds the note once and Escape really cancels it.
        let finished = false;
        function finish(save) {
            if (finished) return;
            finished = true;
            const value = input.value.trim();
            if (save && value) {
                todos.push(value);
                saveTodos();
            }
            isAdding = false;
            renderTodos();
        }

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finish(true);
            } else if (e.key === 'Escape') {
                finish(false);
            }
        });
        input.addEventListener('blur', () => finish(true));

        li.append(dash, input);
        todoList.appendChild(li);
        input.focus();
    }

    addTodoBtn.addEventListener('click', showInlineInput);

    const stored = await getItem('todos');
    if (Array.isArray(stored)) {
        todos = stored.filter(t => typeof t === 'string');
        renderTodos();
    }
}
