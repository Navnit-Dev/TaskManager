        // Global variables & state
        let tasks = [];
        let subtaskTokens = [];
        let editingTaskId = null;

        // Local Storage Key
        const STORAGE_KEY = 'auratask_ecosystem_tasks';

        // DOM Element Cache
        const taskForm = document.getElementById('task-form');
        const taskTitle = document.getElementById('task-title');
        const taskDesc = document.getElementById('task-desc');
        const taskPriority = document.getElementById('task-priority');
        const taskCategorySelect = document.getElementById('task-category-select');
        const tokenInput = document.getElementById('token-input');
        const tokenContainer = document.getElementById('token-container');
        const submitBtn = document.getElementById('submit-btn');
        const submitText = document.getElementById('submit-text');
        const submitIcon = document.getElementById('submit-icon');
        const cancelEditBtn = document.getElementById('cancel-edit-btn');
        const editTaskIdInput = document.getElementById('edit-task-id');
        const formActionBadge = document.getElementById('form-action-badge');

        const taskList = document.getElementById('task-list');
        const emptyState = document.getElementById('empty-state');
        const statsTotal = document.getElementById('stats-total');
        const statsCompleted = document.getElementById('stats-completed');
        const clearAllBtn = document.getElementById('clear-all-btn');

        // Filters
        const filterSearch = document.getElementById('filter-search');
        const filterStatus = document.getElementById('filter-status');
        const filterPriority = document.getElementById('filter-priority');

        // Flow Nodes
        const flowInput = document.getElementById('flow-input');
        const flowDom = document.getElementById('flow-dom');
        const flowStorage = document.getElementById('flow-storage');
        const flowRender = document.getElementById('flow-render');
        const flowMutate = document.getElementById('flow-mutate');

        // Theme
        const themeToggleBtn = document.getElementById('theme-toggle');
        const themeIcon = document.getElementById('theme-icon');
        const themeBadge = document.getElementById('theme-badge');
        const themePulse = document.getElementById('theme-pulse');
        const themeText = document.getElementById('theme-text');

        // Initialize application
        window.addEventListener('load', () => {
            initTheme();
            loadTasksFromStorage();
            renderTasks();
            setupFlowTriggers();
        });

        // ==========================================
        // 1. THEME TOGGLE & MANAGEMENT
        // ==========================================
        function initTheme() {
            // Check stored preference or default to dark
            const storedTheme = localStorage.getItem('auratask_theme') || 'dark';
            applyTheme(storedTheme);
        }

        function applyTheme(theme) {
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
                themeIcon.className = 'fa-solid fa-moon text-indigo-400 text-lg';
                themeBadge.className = 'hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-900/40 bg-indigo-950/20 text-indigo-300';
                themePulse.className = 'w-2 h-2 rounded-full animate-pulse bg-indigo-400';
                themeText.textContent = 'Aura Dark Mode';
                localStorage.setItem('auratask_theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                themeIcon.className = 'fa-solid fa-sun text-amber-500 text-lg';
                themeBadge.className = 'hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-amber-200 bg-amber-50 text-amber-600';
                themePulse.className = 'w-2 h-2 rounded-full animate-pulse bg-amber-500';
                themeText.textContent = 'Aura Light Mode';
                localStorage.setItem('auratask_theme', 'light');
            }
        }

        themeToggleBtn.addEventListener('click', () => {
            const isDark = document.documentElement.classList.contains('dark');
            applyTheme(isDark ? 'light' : 'dark');
            triggerToast('Theme Switched Successfully', 'fa-palette');
        });


        // ==========================================
        // 2. TOKENIZATION SYSTEM (Dynamic Tag Input)
        // ==========================================
        function createTokenElement(text) {
            // DOM creation using requested Vanilla JS structures
            const tokenSpan = document.createElement('span');
            tokenSpan.setAttribute('class', 'inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-zinc-700/80 transition-all');
            
            // Text Node Injection
            const textNode = document.createTextNode(text);
            tokenSpan.appendChild(textNode);

            // Close symbol with specific action
            const removeBtn = document.createElement('button');
            removeBtn.setAttribute('type', 'button');
            removeBtn.setAttribute('class', 'hover:text-rose-500 ml-1 transition-colors');
            
            const closeIcon = document.createElement('i');
            closeIcon.setAttribute('class', 'fa-solid fa-xmark text-[10px]');
            
            removeBtn.appendChild(closeIcon);
            tokenSpan.appendChild(removeBtn);

            // Interactive element to remove itself
            removeBtn.addEventListener('click', () => {
                subtaskTokens = subtaskTokens.filter(t => t !== text);
                tokenSpan.remove(); // Native DOM API element removal
                highlightFlowStage(flowMutate);
            });

            return tokenSpan;
        }

        function addToken(value) {
            const cleaned = value.trim().replace(/,/g, '');
            if (cleaned && !subtaskTokens.includes(cleaned)) {
                subtaskTokens.push(cleaned);
                const tokenEl = createTokenElement(cleaned);
                
                // Prepend or insert before input element inside flow-container
                tokenInput.before(tokenEl);
                highlightFlowStage(flowInput);
            }
            tokenInput.value = '';
        }

        tokenInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addToken(tokenInput.value);
            }
        });

        // Add tokens when user clicks away / blurs
        tokenInput.addEventListener('blur', () => {
            addToken(tokenInput.value);
        });

        function clearAllTokens() {
            subtaskTokens = [];
            // Remove all children except the actual input field
            const tokens = tokenContainer.querySelectorAll('span');
            tokens.forEach(tok => tok.remove());
        }


        // ==========================================
        // 3. TASK LIFECYCLE (CRUD & CUSTOM DOM API)
        // ==========================================
        
        // Flow Architecture State Visualizer
        function highlightFlowStage(stageEl) {
            // Remove previous highlight states from all stages
            [flowInput, flowDom, flowStorage, flowRender, flowMutate].forEach(el => {
                el.classList.remove('border-indigo-500', 'bg-indigo-50', 'dark:bg-indigo-950/50', 'shadow-sm', 'text-indigo-600', 'dark:text-indigo-400');
                el.classList.add('border-slate-100', 'dark:border-zinc-800', 'bg-slate-50', 'dark:bg-zinc-950/40');
            });

            // Highlight selected stage
            stageEl.classList.remove('border-slate-100', 'dark:border-zinc-800', 'bg-slate-50', 'dark:bg-zinc-950/40');
            stageEl.classList.add('border-indigo-500', 'bg-indigo-50', 'dark:bg-indigo-950/50', 'shadow-sm', 'text-indigo-600', 'dark:text-indigo-400');
        }

        function setupFlowTriggers() {
            // Input triggers
            taskTitle.addEventListener('input', () => highlightFlowStage(flowInput));
            taskDesc.addEventListener('input', () => highlightFlowStage(flowInput));
        }

        // Add/Edit Submission
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Visual Pipeline activation
            highlightFlowStage(flowInput);

            const title = taskTitle.value.trim();
            const desc = taskDesc.value.trim();
            const priority = taskPriority.value;
            const category = taskCategorySelect.value;

            if (!title) return;

            if (editingTaskId) {
                // UPDATE PIPELINE
                const taskIndex = tasks.findIndex(t => t.id === editingTaskId);
                if (taskIndex > -1) {
                    tasks[taskIndex].title = title;
                    tasks[taskIndex].description = desc;
                    tasks[taskIndex].priority = priority;
                    tasks[taskIndex].category = category;
                    tasks[taskIndex].subtasks = [...subtaskTokens];
                }

                // Reset Action Mode
                editingTaskId = null;
                submitText.textContent = 'Add Task Card';
                submitIcon.className = 'fa-solid fa-plus-circle';
                formActionBadge.textContent = 'Ready';
                formActionBadge.className = 'px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400';
                cancelEditBtn.classList.add('hidden');
                triggerToast('Task Card Replaced', 'fa-wrench');
            } else {
                // CREATION PIPELINE
                const newTask = {
                    id: Date.now().toString(),
                    title,
                    description: desc,
                    priority,
                    category,
                    subtasks: [...subtaskTokens],
                    completed: false,
                    createdAt: new Date().toISOString()
                };

                tasks.unshift(newTask);
                triggerToast('Created Custom DOM Elements', 'fa-microchip');
            }

            // Sync with memory representation
            saveTasksToStorage();
            
            // Clean interface
            taskForm.reset();
            clearAllTokens();
            
            // Synchronize interface view
            renderTasks();
        });

        // Cancel editing mode
        cancelEditBtn.addEventListener('click', () => {
            editingTaskId = null;
            taskForm.reset();
            clearAllTokens();
            submitText.textContent = 'Add Task Card';
            submitIcon.className = 'fa-solid fa-plus-circle';
            formActionBadge.textContent = 'Ready';
            formActionBadge.className = 'px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400';
            cancelEditBtn.classList.add('hidden');
            highlightFlowStage(flowMutate);
        });

        // Task state modification helpers
        function saveTasksToStorage() {
            highlightFlowStage(flowStorage);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        }

        function loadTasksFromStorage() {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                try {
                    tasks = JSON.parse(raw);
                } catch (e) {
                    tasks = [];
                }
            }
        }

        // DOM Rendering logic utilizing requested element injections
        function renderTasks() {
            highlightFlowStage(flowRender);

            // Filter conditions
            const searchVal = filterSearch.value.toLowerCase();
            const statusVal = filterStatus.value;
            const priorityVal = filterPriority.value;

            // Clear current list DOM
            taskList.innerHTML = '';

            const filtered = tasks.filter(task => {
                const matchesSearch = task.title.toLowerCase().includes(searchVal) || 
                                      task.description.toLowerCase().includes(searchVal) ||
                                      task.subtasks.some(tag => tag.toLowerCase().includes(searchVal)) ||
                                      task.category.toLowerCase().includes(searchVal);
                
                const matchesStatus = statusVal === 'all' || 
                                     (statusVal === 'completed' && task.completed) || 
                                     (statusVal === 'pending' && !task.completed);

                const matchesPriority = priorityVal === 'all' || task.priority === priorityVal;

                return matchesSearch && matchesStatus && matchesPriority;
            });

            // Update Statistics
            statsTotal.textContent = tasks.length;
            statsCompleted.textContent = tasks.filter(t => t.completed).length;

            if (filtered.length === 0) {
                emptyState.classList.remove('hidden');
            } else {
                emptyState.classList.add('hidden');
                
                // Build dynamic UI utilizing structural DOM properties
                filtered.forEach(task => {
                    const taskCard = buildTaskCardDOM(task);
                    taskList.appendChild(taskCard);
                });
            }
        }

        // CORE MANIFESTATION: Constructing DOM entirely using Pure Javascript Node & Attributes API
        function buildTaskCardDOM(task) {
            // Root Card Element
            const card = document.createElement('div');
            card.setAttribute('class', 'bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm hover:shadow-md border border-slate-100 dark:border-zinc-800/80 transition-all duration-300 relative group overflow-hidden');
            
            // Custom Data Attributes (Requirement)
            card.setAttribute('data-id', task.id);
            card.setAttribute('data-completed', task.completed);
            card.setAttribute('data-priority', task.priority);
            card.setAttribute('data-category', task.category);

            // Left Border Indicator accent for status & priority
            const borderAccent = document.createElement('div');
            let accentClass = "absolute left-0 top-0 bottom-0 w-1.5 ";
            if (task.completed) {
                accentClass += "bg-emerald-500";
            } else {
                if (task.priority === 'high') accentClass += "bg-rose-500";
                else if (task.priority === 'medium') accentClass += "bg-amber-500";
                else accentClass += "bg-emerald-500";
            }
            borderAccent.setAttribute('class', accentClass);
            card.appendChild(borderAccent);

            // Top Layout Block: Category Chip & Completion Toggle
            const topRow = document.createElement('div');
            topRow.setAttribute('class', 'flex items-center justify-between mb-3');

            // Category tag
            const catBadge = document.createElement('span');
            let catEmoji = "✨";
            if (task.category === "Work") catEmoji = "💼";
            else if (task.category === "Personal") catEmoji = "🏡";
            else if (task.category === "Finance") catEmoji = "💳";
            else if (task.category === "Health") catEmoji = "💪";

            catBadge.setAttribute('class', 'px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 flex items-center gap-1');
            const catTextNode = document.createTextNode(`${catEmoji} ${task.category}`);
            catBadge.appendChild(catTextNode);

            // Priority Badge
            const priorityBadge = document.createElement('span');
            let priorityClass = "text-2xs font-bold tracking-wider uppercase px-2 py-0.5 rounded-md ";
            let priorityLabel = "";
            if (task.priority === 'high') {
                priorityClass += "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400";
                priorityLabel = "High Priority";
            } else if (task.priority === 'medium') {
                priorityClass += "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400";
                priorityLabel = "Med Priority";
            } else {
                priorityClass += "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400";
                priorityLabel = "Low Priority";
            }
            priorityBadge.setAttribute('class', priorityClass);
            priorityBadge.appendChild(document.createTextNode(priorityLabel));

            const topBadges = document.createElement('div');
            topBadges.setAttribute('class', 'flex items-center gap-1.5');
            topBadges.append(catBadge, priorityBadge);

            // Completion check circle button
            const statusToggleBtn = document.createElement('button');
            statusToggleBtn.setAttribute('class', `h-6 w-6 rounded-full border flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-zinc-700 text-transparent hover:border-emerald-500'}`);
            
            const checkIcon = document.createElement('i');
            checkIcon.setAttribute('class', 'fa-solid fa-check text-[10px]');
            statusToggleBtn.appendChild(checkIcon);

            statusToggleBtn.addEventListener('click', () => {
                toggleTaskCompletion(task.id, card);
            });

            topRow.append(topBadges, statusToggleBtn);
            card.appendChild(topRow);

            // Main Details Block
            const detailsBlock = document.createElement('div');
            detailsBlock.setAttribute('class', 'space-y-1.5 mb-4');

            // Title
            const titleEl = document.createElement('h3');
            titleEl.setAttribute('class', `text-sm font-semibold tracking-tight transition-all ${task.completed ? 'line-through text-slate-400 dark:text-zinc-500' : 'text-slate-800 dark:text-zinc-100'}`);
            const titleTextNode = document.createTextNode(task.title);
            titleEl.appendChild(titleTextNode);

            // Optional Description
            detailsBlock.appendChild(titleEl);
            if (task.description) {
                const descEl = document.createElement('p');
                descEl.setAttribute('class', `text-xs leading-relaxed ${task.completed ? 'text-slate-400 dark:text-zinc-500' : 'text-slate-500 dark:text-zinc-400'}`);
                const descTextNode = document.createTextNode(task.description);
                descEl.appendChild(descTextNode);
                detailsBlock.appendChild(descEl);
            }

            card.appendChild(detailsBlock);

            // Dynamic Token Chips Container (For custom tagging subtasks/tokens)
            if (task.subtasks && task.subtasks.length > 0) {
                const subtaskWrapper = document.createElement('div');
                subtaskWrapper.setAttribute('class', 'flex flex-wrap gap-1.5 mb-4');
                
                task.subtasks.forEach(sub => {
                    const subChip = document.createElement('span');
                    subChip.setAttribute('class', 'px-2 py-0.5 rounded bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800/80 text-[10px] font-semibold text-slate-500 dark:text-zinc-400');
                    subChip.appendChild(document.createTextNode(`#${sub}`));
                    subtaskWrapper.appendChild(subChip);
                });
                card.appendChild(subtaskWrapper);
            }

            // Divider Line
            const divider = document.createElement('hr');
            divider.setAttribute('class', 'border-slate-100 dark:border-zinc-800/50 my-3.5');
            card.appendChild(divider);

            // Action Panel Block
            const actionRow = document.createElement('div');
            actionRow.setAttribute('class', 'flex items-center justify-between');

            // Render Time Label
            const timeLabel = document.createElement('span');
            timeLabel.setAttribute('class', 'text-[10px] text-slate-400 dark:text-zinc-500 font-medium');
            const dateObj = new Date(task.createdAt);
            const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            timeLabel.appendChild(document.createTextNode(`Created at ${formattedTime}`));

            // Edit & Delete button interactions
            const actionGroup = document.createElement('div');
            actionGroup.setAttribute('class', 'flex items-center space-x-1.5');

            // Edit Action
            const editBtn = document.createElement('button');
            editBtn.setAttribute('class', 'p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-zinc-800 rounded-lg transition-all');
            editBtn.setAttribute('title', 'Edit Card');
            
            const editIcon = document.createElement('i');
            editIcon.setAttribute('class', 'fa-solid fa-pen text-xs');
            editBtn.appendChild(editIcon);

            editBtn.addEventListener('click', () => {
                activateEditMode(task);
            });

            // Delete Action
            const deleteBtn = document.createElement('button');
            deleteBtn.setAttribute('class', 'p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-zinc-800 rounded-lg transition-all');
            deleteBtn.setAttribute('title', 'Delete Card');
            
            const deleteIcon = document.createElement('i');
            deleteIcon.setAttribute('class', 'fa-solid fa-trash text-xs');
            deleteBtn.appendChild(deleteIcon);

            deleteBtn.addEventListener('click', () => {
                deleteTask(task.id, card);
            });

            actionGroup.append(editBtn, deleteBtn);
            actionRow.append(timeLabel, actionGroup);
            card.appendChild(actionRow);

            return card;
        }

        // Task Action: Toggle Completion
        function toggleTaskCompletion(taskId, cardElement) {
            highlightFlowStage(flowMutate);
            
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.completed = !task.completed;
                saveTasksToStorage();

                // Advanced DOM manipulation demo: Prepend completed task to bottom/top
                if (task.completed) {
                    triggerToast('Task marked Completed!', 'fa-circle-check');
                    // Demonstration of using before/after/prepend methods
                    // We move the completed item to the end of the list elegantly
                    taskList.append(cardElement);
                } else {
                    triggerToast('Task marked Pending', 'fa-circle-question');
                    taskList.prepend(cardElement);
                }
                
                // Re-render to ensure filters and statistics remain perfectly accurate
                renderTasks();
            }
        }

        // Task Action: Delete
        function deleteTask(taskId, cardElement) {
            highlightFlowStage(flowMutate);
            
            // Delete with transition animation
            cardElement.classList.add('scale-95', 'opacity-0');
            
            setTimeout(() => {
                // Delete from structural array
                tasks = tasks.filter(t => t.id !== taskId);
                saveTasksToStorage();
                
                // Native structural removal as requested by requirements
                cardElement.remove();
                
                triggerToast('DOM Node removed successfully', 'fa-eraser');
                renderTasks();
            }, 200);
        }

        // Task Action: Edit Mode Loader
        function activateEditMode(task) {
            highlightFlowStage(flowInput);

            editingTaskId = task.id;
            
            // Populate Form fields
            taskTitle.value = task.title;
            taskDesc.value = task.description || '';
            taskPriority.value = task.priority;
            taskCategorySelect.value = task.category;

            // Load Tags to subtask token system
            clearAllTokens();
            task.subtasks.forEach(tag => {
                subtaskTokens.push(tag);
                const tokenEl = createTokenElement(tag);
                tokenInput.before(tokenEl);
            });

            // Update creation button text to Edit mode styling
            submitText.textContent = 'Save Task Edits';
            submitIcon.className = 'fa-solid fa-pen-to-square';
            formActionBadge.textContent = 'Editing Mode';
            formActionBadge.className = 'px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400';
            cancelEditBtn.classList.remove('hidden');

            // Scroll form smoothly into viewport for mobile devices
            taskForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Task Action: Clear All Ecosystem Data
        clearAllBtn.addEventListener('click', () => {
            if (tasks.length === 0) return;
            
            highlightFlowStage(flowMutate);
            
            if (confirm('Are you absolutely sure you want to clear all tasks from the current ecosystem session?')) {
                tasks = [];
                saveTasksToStorage();
                renderTasks();
                triggerToast('Ecosystem cleared entirely', 'fa-trash');
            }
        });


        // ==========================================
        // 4. FILTERING & SEARCH EVENTS
        // ==========================================
        filterSearch.addEventListener('input', renderTasks);
        filterStatus.addEventListener('change', renderTasks);
        filterPriority.addEventListener('change', renderTasks);


        // ==========================================
        // 5. HELPER: MICRO-TOAST SYSTEM
        // ==========================================
        let toastTimeout;
        function triggerToast(message, iconClass = 'fa-check') {
            const toast = document.getElementById('toast');
            const toastText = document.getElementById('toast-text');
            const toastIcon = document.getElementById('toast-icon');

            toastText.textContent = message;
            toastIcon.innerHTML = `<i class="fa-solid ${iconClass} text-[10px]"></i>`;

            // Reset transition position
            toast.classList.remove('translate-y-20', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');

            clearTimeout(toastTimeout);
            toastTimeout = setTimeout(() => {
                toast.classList.remove('translate-y-0', 'opacity-100');
                toast.classList.add('translate-y-20', 'opacity-0');
            }, 3000);
        }
