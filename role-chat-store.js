window.RoleChatStore = (() => {
  const CHARACTERS_KEY = "role-chat-characters";
  const CURRENT_KEY = "role-chat-current-character";

  function nowIso() {
    return new Date().toISOString();
  }

  function safeJsonParse(raw, fallback) {
    if (!raw) {
      return fallback;
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function getCharacters() {
    const items = safeJsonParse(localStorage.getItem(CHARACTERS_KEY), []);
    return Array.isArray(items) ? items : [];
  }

  function saveCharacters(items) {
    localStorage.setItem(CHARACTERS_KEY, JSON.stringify(items));
    return items;
  }

  function setCurrentCharacterId(id) {
    if (id) {
      localStorage.setItem(CURRENT_KEY, id);
    } else {
      localStorage.removeItem(CURRENT_KEY);
    }
  }

  function getCurrentCharacterId() {
    return localStorage.getItem(CURRENT_KEY) || "";
  }

  function createCharacter(seed = {}) {
    const timestamp = nowIso();
    const character = {
      id: `role-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: seed.name || "未命名角色",
      avatar: seed.avatar || "",
      description: seed.description || "",
      pastDialogues: seed.pastDialogues || "",
      referenceInfo: seed.referenceInfo || "",
      messages: Array.isArray(seed.messages) ? seed.messages : [],
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const items = getCharacters();
    items.unshift(character);
    saveCharacters(items);
    setCurrentCharacterId(character.id);
    return character;
  }

  function getCharacterById(id) {
    return getCharacters().find((item) => item.id === id) || null;
  }

  function getCurrentCharacter() {
    const id = getCurrentCharacterId();
    return id ? getCharacterById(id) : null;
  }

  function updateCharacter(id, updater) {
    const items = getCharacters();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }
    const current = items[index];
    const next = typeof updater === "function" ? updater(current) : { ...current, ...updater };
    next.updatedAt = nowIso();
    items[index] = next;
    saveCharacters(items);
    return next;
  }

  function appendMessage(id, message) {
    return updateCharacter(id, (current) => ({
      ...current,
      messages: [...(current.messages || []), message]
    }));
  }

  function replaceLastMessage(id, message) {
    return updateCharacter(id, (current) => {
      const messages = [...(current.messages || [])];
      if (!messages.length) {
        messages.push(message);
      } else {
        messages[messages.length - 1] = message;
      }
      return { ...current, messages };
    });
  }

  function deleteCharacter(id) {
    const next = getCharacters().filter((item) => item.id !== id);
    saveCharacters(next);
    if (getCurrentCharacterId() === id) {
      setCurrentCharacterId(next[0]?.id || "");
    }
    return next;
  }

  function formatPreviewText(character) {
    const lastMessage = [...(character.messages || [])].reverse().find((item) => item.role === "assistant" || item.role === "user");
    if (lastMessage?.content) {
      return lastMessage.content;
    }
    return character.description || "新角色已创建，等待开始对话。";
  }

  return {
    getCharacters,
    createCharacter,
    getCharacterById,
    getCurrentCharacter,
    getCurrentCharacterId,
    setCurrentCharacterId,
    updateCharacter,
    appendMessage,
    replaceLastMessage,
    deleteCharacter,
    formatPreviewText
  };
})();
