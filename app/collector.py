import pathlib

def generate_tree(path, prefix=""):
    """ディレクトリ構造をテキストのツリー形式で生成する"""
    tree_str = ""
    # node_modules や .git などは除外
    exclude = {".git", "node_modules", "__pycache__", ".next", ".vscode", "dist"}
    
    try:
        items = sorted([p for p in path.iterdir() if p.name not in exclude])
    except PermissionError:
        return ""

    for i, item in enumerate(items):
        connector = "└── " if i == len(items) - 1 else "├── "
        tree_str += f"{prefix}{connector}{item.name}\n"
        if item.is_dir():
            extension = "    " if i == len(items) - 1 else "│   "
            tree_str += generate_tree(item, prefix + extension)
    return tree_str

def merge_code_files(target_dir: str, output_file: str):
    base_path = pathlib.Path(target_dir)
    output_path = pathlib.Path(output_file)
    
    # CSSを追加
    extensions = {".py", ".ts", ".tsx", ".css"}
    
    # 対象ファイルを取得
    code_files = sorted([
        p for p in base_path.rglob("*") 
        if p.suffix in extensions and p.is_file()
    ])
    
    with output_path.open("w", encoding="utf-8") as f_out:
        # --- 冒頭にディレクトリ構造を書き込む ---
        f_out.write(f"{'#'*80}\n")
        f_out.write(f" DIRECTORY STRUCTURE\n")
        f_out.write(f"{'#'*80}\n\n")
        f_out.write(f". (ROOT: {base_path.resolve().name})\n")
        f_out.write(generate_tree(base_path))
        f_out.write(f"\n{'#'*80}\n\n")

        # --- 各ファイルの内容を書き込む ---
        for code_file in code_files:
            # 自分自身や特定のディレクトリを除外
            if code_file.resolve() == output_path.resolve():
                continue
            if any(part in code_file.parts for part in ["node_modules", ".next", ".git", "__pycache__"]):
                continue
                
            relative_path = code_file.relative_to(base_path)
            
            f_out.write(f"\n{'='*80}\n")
            f_out.write(f" FILE: {relative_path}\n")
            f_out.write(f"{'='*80}\n\n")
            
            try:
                content = code_file.read_text(encoding="utf-8")
                f_out.write(content)
                f_out.write("\n")
                print(f"Combined: {relative_path}")
            except Exception as e:
                f_out.write(f"Error reading file: {e}\n")
                print(f"Failed to read: {relative_path}")

if __name__ == "__main__":
    # カレントディレクトリを対象に all_codes_combined.txt を生成
    merge_code_files(".", "all_codes_combined.txt")