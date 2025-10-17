(() => {
  const STORAGE_KEY = 'todo.tasks.v1';
  let tasks = [];
  let filter = 'all';
  const el = {
    addForm: document.getElementById('addForm'),
    newTask: document.getElementById('newTask'),
    taskList: document.getElementById('taskList'),
    count: document.getElementById('count'),
    clearCompleted: document.getElementById('clearCompleted'),
    filters: document.querySelectorAll('.filter-btn'),
    empty: document.getElementById('empty')
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      tasks = raw ? JSON.parse(raw) : [];
    } catch (e) {
      tasks = [];
      console.warn('Could not parse saved tasks', e);
    }
  }

  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }

  function render() {
    el.taskList.innerHTML = '';
    const shown = tasks.filter(t => {
      if (filter === 'active') return !t.completed;
      if (filter === 'completed') return t.completed;
      return true;
    });

    el.empty.style.display = shown.length ? 'none' : 'block';

    shown.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task';
      li.draggable = true;
      li.dataset.id = task.id;
      const left = document.createElement('div');
      left.className = 'left';

      const checkbox = document.createElement('button');
      checkbox.className = 'checkbox' + (task.completed ? ' checked' : '');
      checkbox.setAttribute('aria-pressed', task.completed ? 'true' : 'false');
      checkbox.title = task.completed ? 'Mark as active' : 'Mark as completed';
      checkbox.innerHTML = task.completed ? '✓' : '';
      checkbox.addEventListener('click', () => toggleComplete(task.id));

      const text = document.createElement('div');
      text.className = 'task-text' + (task.completed ? ' completed' : '');
      text.textContent = task.text;
      text.tabIndex = 0;
      text.setAttribute('role', 'textbox');
      text.setAttribute('aria-label', 'Task: ' + task.text);
      text.addEventListener('dblclick', () => enterEditMode(li, task));
      text.addEventListener('keydown', e => {
        if(e.key==='Enter') enterEditMode(li, task);
      });

      left.appendChild(checkbox);
      left.appendChild(text);

      const actions = document.createElement('div');
      actions.className = 'actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'icon-btn';
      editBtn.title = 'Edit';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => enterEditMode(li, task));

      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn';
      delBtn.title = 'Delete';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => deleteTask(task.id));

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      li.appendChild(left);
      li.appendChild(actions);

      addDragHandlers(li);
      el.taskList.appendChild(li);
    });

    updateCount();
  }

  function updateCount() {
    const remaining = tasks.filter(t => !t.completed).length;
    el.count.textContent = `${remaining} item${remaining !== 1 ? 's' : ''} left`;
  }

  function addTask(text) {
    const trimmed = text.trim();
    if(!trimmed) return;
    tasks.push({ id: Date.now().toString(), text: trimmed, completed: false });
    save();
    render();
  }

  function toggleComplete(id) {
    tasks = tasks.map(t => t.id===id ? { ...t, completed: !t.completed } : t);
    save(); render();
  }

  function deleteTask(id) {
    tasks = tasks.filter(t => t.id!==id);
    save(); render();
  }

  function clearCompleted() {
    tasks = tasks.filter(t => !t.completed);
    save(); render();
  }

  function editTask(id, newText) {
    tasks = tasks.map(t => t.id===id ? { ...t, text: newText } : t);
    save(); render();
  }

  function enterEditMode(li, task) {
    const input = document.createElement('input');
    input.className = 'edit-input';
    input.value = task.text;
    input.setAttribute('aria-label', 'Edit task');
    const left = li.querySelector('.left');
    left.replaceChild(input, left.querySelector('.task-text'));
    input.focus();
    input.select();

    function commit() {
      const v = input.value.trim();
      if(!v) deleteTask(task.id);
      else editTask(task.id, v);
    }

    input.addEventListener('keydown', e => { if(e.key==='Enter') commit(); if(e.key==='Escape') render(); });
    input.addEventListener('blur', commit);
  }

  function setFilter(f) {
    filter=f;
    el.filters.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter===f);
      btn.setAttribute('aria-selected', btn.dataset.filter===f ? 'true':'false');
    });
    render();
  }

  let dragSrcId=null;
  function addDragHandlers(li){
    li.addEventListener('dragstart', e=>{ dragSrcId=li.dataset.id; li.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; try{ e.dataTransfer.setData('text/plain', dragSrcId); } catch{} });
    li.addEventListener('dragend', ()=>{ dragSrcId=null; li.classList.remove('dragging'); });
    li.addEventListener('dragover', e=>{ e.preventDefault(); e.dataTransfer.dropEffect='move'; });
    li.addEventListener('drop', e=>{
      e.preventDefault();
      const targetId = li.dataset.id;
      const src = dragSrcId || e.dataTransfer.getData('text/plain');
      if(!src || src===targetId) return;
      reorderTasks(src,targetId);
    });
  }

  function reorderTasks(srcId,targetId){
    const srcIndex = tasks.findIndex(t=>t.id===srcId);
    const targetIndex = tasks.findIndex(t=>t.id===targetId);
    if(srcIndex<0||targetIndex<0) return;
    const [item] = tasks.splice(srcIndex,1);
    tasks.splice(targetIndex,0,item);
    save(); render();
  }

  el.addForm.addEventListener('submit', e=>{ e.preventDefault(); addTask(el.newTask.value); el.newTask.value=''; el.newTask.focus(); });
  el.clearCompleted.addEventListener('click', clearCompleted);
  el.filters.forEach(btn => btn.addEventListener('click', ()=>setFilter(btn.dataset.filter)));

  load(); render();

  window.todoApp = { get tasks(){return tasks;}, reload:()=>{load(); render();} };
})();