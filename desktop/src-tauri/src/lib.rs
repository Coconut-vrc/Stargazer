// Stargazer: 完全ローカル用 Tauri コマンド（LocalAppData / ファイル操作のみ）

// --- LocalAppData/CosmoArtsStore: cast, import, app, backup ---
fn cosmoarts_store_dir() -> Result<std::path::PathBuf, String> {
    let local = std::env::var("LOCALAPPDATA").map_err(|_| "LOCALAPPDATA が取得できません".to_string())?;
    Ok(std::path::PathBuf::from(local).join("CosmoArtsStore"))
}

#[tauri::command]
fn get_app_data_dir() -> Result<String, String> {
    let path = cosmoarts_store_dir()?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn ensure_app_dirs() -> Result<(), String> {
    let base = cosmoarts_store_dir()?;
    for name in ["cast", "import", "app", "backup"] {
        let dir = base.join(name);
        std::fs::create_dir_all(&dir).map_err(|e| format!("フォルダ作成失敗 {}: {}", dir.display(), e))?;
    }
    Ok(())
}

#[tauri::command]
fn check_app_dirs_exist() -> Result<bool, String> {
    let base = cosmoarts_store_dir()?;
    if !base.exists() {
        return Ok(false);
    }
    for name in ["cast", "import", "app", "backup"] {
        let dir = base.join(name);
        if !dir.exists() {
            return Ok(false);
        }
    }
    Ok(true)
}

// --- JSON ローカルDB（キャスト・NG） ---
fn cast_db_path() -> Result<std::path::PathBuf, String> {
    let base = cosmoarts_store_dir()?;
    Ok(base.join("cast").join("cast.json"))
}

#[tauri::command]
fn read_cast_db_json() -> Result<String, String> {
    let path = cast_db_path()?;
    if path.exists() {
        std::fs::read_to_string(&path).map_err(|e| format!("cast.json 読み込み失敗: {}", e))
    } else {
        Ok(r#"{"casts":[]}"#.to_string())
    }
}

#[tauri::command]
fn write_cast_db_json(content: String) -> Result<(), String> {
    let path = cast_db_path()?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, content).map_err(|e| format!("cast.json 保存失敗: {}", e))
}

// --- デバッグ: LocalAppData 内フォルダ構造 ---
#[derive(serde::Serialize)]
struct DirEntry {
    name: String,
    path: String,
    is_dir: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    children: Option<Vec<DirEntry>>,
}

fn list_dir_recursive(path: &std::path::Path, base: &std::path::Path) -> Result<Vec<DirEntry>, String> {
    let mut entries = Vec::new();
    let read_dir = std::fs::read_dir(path).map_err(|e| format!("read_dir 失敗 {}: {}", path.display(), e))?;
    for item in read_dir {
        let entry = item.map_err(|e| e.to_string())?;
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        let full = entry.path();
        let rel_path = full.strip_prefix(base).unwrap_or(&full);
        let path_str = rel_path.to_string_lossy().to_string();
        let is_dir = meta.is_dir();
        let children = if is_dir {
            Some(list_dir_recursive(&full, base).unwrap_or_default())
        } else {
            None
        };
        entries.push(DirEntry {
            name,
            path: path_str,
            is_dir,
            children,
        });
    }
    entries.sort_by(|a, b| {
        let a_is_dir = a.is_dir;
        let b_is_dir = b.is_dir;
        match (a_is_dir, b_is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });
    Ok(entries)
}

#[tauri::command]
fn list_app_data_structure() -> Result<DirEntry, String> {
    let base = cosmoarts_store_dir()?;
    let name = base.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| "CosmoArtsStore".to_string());
    let path_str = base.to_string_lossy().to_string();
    if !base.exists() {
        return Ok(DirEntry {
            name,
            path: path_str,
            is_dir: true,
            children: Some(vec![]),
        });
    }
    let children = list_dir_recursive(&base, &base)?;
    Ok(DirEntry {
        name,
        path: path_str,
        is_dir: true,
        children: Some(children),
    })
}

/// ユーザーが選択したファイル（CSV 等）の内容を読み込む
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    let p = std::path::Path::new(&path);
    if !p.exists() {
        return Err("ファイルが見つかりません".to_string());
    }
    std::fs::read_to_string(p).map_err(|e| format!("ファイル読み込み失敗: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_app_data_dir,
            ensure_app_dirs,
            check_app_dirs_exist,
            read_cast_db_json,
            write_cast_db_json,
            list_app_data_structure,
            read_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
