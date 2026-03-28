window.ReportTaskStore = (() => {
  const RECORDS_KEY = "report-agent-records";
  const CURRENT_KEY = "report-agent-current-record";
  const LEGACY_KEYS = {
    draft: "report-agent-draft",
    outline: "report-agent-outline",
    doc: "report-agent-doc",
    docProgress: "report-agent-doc-progress"
  };

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

  function getRecords() {
    const records = safeJsonParse(localStorage.getItem(RECORDS_KEY), []);
    const normalized = Array.isArray(records) ? records : [];
    if (normalized.length > 0) {
      return normalized;
    }
    return importLegacySessionIfNeeded();
  }

  function saveRecords(records) {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    return records;
  }

  function importLegacySessionIfNeeded() {
    const draft = safeJsonParse(sessionStorage.getItem(LEGACY_KEYS.draft), null);
    const outline = safeJsonParse(sessionStorage.getItem(LEGACY_KEYS.outline), null);
    const doc = safeJsonParse(sessionStorage.getItem(LEGACY_KEYS.doc), null);
    const docProgress = safeJsonParse(sessionStorage.getItem(LEGACY_KEYS.docProgress), null);

    if (!draft && !outline && !doc && !docProgress) {
      return [];
    }

    const record = buildRecord({
      name: draft?.name || "项目申报方案",
      draft: draft || {
        requirement: "",
        name: "项目申报方案",
        attachment: null
      }
    });

    record.outline = outline;
    record.doc = doc;
    record.docProgress = docProgress;
    record.status = doc ? "已完成" : docProgress ? "正文生成中" : outline ? "大纲已生成" : "需求录入中";
    record.step = doc || docProgress ? 3 : outline ? 2 : 1;

    saveRecords([record]);
    setCurrentId(record.id);
    return [record];
  }

  function buildRecord(seed = {}) {
    const timestamp = nowIso();
    return {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: timestamp,
      updatedAt: timestamp,
      name: seed.name || "项目申报方案",
      status: "需求录入中",
      step: 1,
      draft: seed.draft || {
        requirement: "",
        name: seed.name || "项目申报方案",
        attachment: null
      },
      outline: null,
      doc: null,
      docProgress: null
    };
  }

  function getCurrentId() {
    return localStorage.getItem(CURRENT_KEY) || "";
  }

  function setCurrentId(id) {
    if (id) {
      localStorage.setItem(CURRENT_KEY, id);
    } else {
      localStorage.removeItem(CURRENT_KEY);
    }
  }

  function getRecordById(id) {
    return getRecords().find((item) => item.id === id) || null;
  }

  function syncLegacySession(record) {
    if (!record) {
      Object.values(LEGACY_KEYS).forEach((key) => sessionStorage.removeItem(key));
      return;
    }

    if (record.draft) {
      sessionStorage.setItem(LEGACY_KEYS.draft, JSON.stringify(record.draft));
    } else {
      sessionStorage.removeItem(LEGACY_KEYS.draft);
    }

    if (record.outline) {
      sessionStorage.setItem(LEGACY_KEYS.outline, JSON.stringify(record.outline));
    } else {
      sessionStorage.removeItem(LEGACY_KEYS.outline);
    }

    if (record.doc) {
      sessionStorage.setItem(LEGACY_KEYS.doc, JSON.stringify(record.doc));
    } else {
      sessionStorage.removeItem(LEGACY_KEYS.doc);
    }

    if (record.docProgress) {
      sessionStorage.setItem(LEGACY_KEYS.docProgress, JSON.stringify(record.docProgress));
    } else {
      sessionStorage.removeItem(LEGACY_KEYS.docProgress);
    }
  }

  function getCurrentRecord() {
    const currentId = getCurrentId();
    if (!currentId) {
      return null;
    }
    const record = getRecordById(currentId);
    if (record) {
      syncLegacySession(record);
    }
    return record;
  }

  function ensureCurrentRecord(seed = {}) {
    const current = getCurrentRecord();
    if (current) {
      return current;
    }
    return createRecord(seed);
  }

  function createRecord(seed = {}) {
    const record = buildRecord(seed);
    const records = getRecords();
    records.unshift(record);
    saveRecords(records);
    setCurrentId(record.id);
    syncLegacySession(record);
    return record;
  }

  function updateRecord(id, updater) {
    const records = getRecords();
    const index = records.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }

    const currentRecord = records[index];
    const nextRecord = typeof updater === "function" ? updater(currentRecord) : { ...currentRecord, ...updater };
    nextRecord.updatedAt = nowIso();
    records[index] = nextRecord;
    saveRecords(records);

    if (getCurrentId() === id) {
      syncLegacySession(nextRecord);
    }
    return nextRecord;
  }

  function updateCurrentRecord(updater) {
    const current = ensureCurrentRecord();
    return updateRecord(current.id, updater);
  }

  function setCurrentRecordById(id) {
    const record = getRecordById(id);
    if (!record) {
      return null;
    }
    setCurrentId(id);
    syncLegacySession(record);
    return record;
  }

  function saveDraft(draft) {
    return updateCurrentRecord((record) => ({
      ...record,
      name: draft.name || record.name || "项目申报方案",
      status: "需求录入中",
      step: 1,
      draft,
      outline: record.outline,
      doc: record.doc,
      docProgress: record.docProgress
    }));
  }

  function saveOutline(outline, options = {}) {
    return updateCurrentRecord((record) => ({
      ...record,
      name: record.draft?.name || record.name || "项目申报方案",
      status: options.status || "大纲已生成",
      step: 2,
      outline,
      doc: options.resetDoc ? null : record.doc,
      docProgress: options.resetDoc ? null : record.docProgress
    }));
  }

  function saveDocProgress(progress, status = "正文生成中") {
    return updateCurrentRecord((record) => ({
      ...record,
      status,
      step: 3,
      docProgress: progress
    }));
  }

  function saveDoc(doc) {
    return updateCurrentRecord((record) => ({
      ...record,
      status: "已完成",
      step: 3,
      doc,
      docProgress: null
    }));
  }

  function clearDocState(status = "大纲已生成") {
    return updateCurrentRecord((record) => ({
      ...record,
      status,
      step: Math.min(record.step || 2, 3),
      doc: null,
      docProgress: null
    }));
  }

  function getCurrentPageHref(record) {
    if (!record) {
      return "./report-agent.html";
    }
    if (record.doc || record.docProgress || record.step >= 3) {
      return "./report-write.html";
    }
    if (record.outline || record.step >= 2) {
      return "./report-outline.html";
    }
    return "./report-agent.html";
  }

  return {
    LEGACY_KEYS,
    getRecords,
    getCurrentId,
    getCurrentRecord,
    getRecordById,
    setCurrentRecordById,
    ensureCurrentRecord,
    createRecord,
    updateCurrentRecord,
    saveDraft,
    saveOutline,
    saveDocProgress,
    saveDoc,
    clearDocState,
    getCurrentPageHref,
    syncLegacySession
  };
})();
