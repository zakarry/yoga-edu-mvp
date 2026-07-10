from pathlib import Path

app = Path('/home/user/yoga-edu-mvp/src/App.tsx')
css = Path('/home/user/yoga-edu-mvp/src/styles/global.css')

app_text = app.read_text()

old_state = """  const [searchKeyword, setSearchKeyword] = useState('');\n  const [searchArea, setSearchArea] = useState<'all' | string>('all');\n  const [detailItem, setDetailItem] = useState<SearchItem | null>(null);\n"""
new_state = """  const [searchKeyword, setSearchKeyword] = useState('');\n  const [searchArea, setSearchArea] = useState<'all' | string>('all');\n  const [detailItem, setDetailItem] = useState<SearchItem | null>(null);\n  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);\n"""
if old_state not in app_text:
    raise SystemExit('state block not found')
app_text = app_text.replace(old_state, new_state)

old_move = """  const moveTo = (next: PageKey) => {\n    setPage(next);\n    window.scrollTo({ top: 0, behavior: 'smooth' });\n  };\n"""
new_move = """  const moveTo = (next: PageKey) => {\n    setMobileMenuOpen(false);\n    setPage(next);\n    window.scrollTo({ top: 0, behavior: 'smooth' });\n  };\n"""
if old_move not in app_text:
    raise SystemExit('moveTo block not found')
app_text = app_text.replace(old_move, new_move)

old_header = """      <header className=\"topbar\">\n        <button className=\"brandmark\" onClick={() => moveTo('home')}>Yoga Organization of Japan</button>\n        <nav className=\"nav-row\">\n          <button onClick={() => moveTo('diagnosis')}>生徒向け診断</button>\n          <button onClick={() => moveTo('search')}>検索・一覧</button>\n          <button onClick={() => moveTo('pro-yoga')}>プロYoga検定</button>\n        </nav>\n      </header>\n"""
new_header = """      <header className=\"topbar\">\n        <div className=\"topbar-brand-row\">\n          <button className=\"brandmark\" onClick={() => moveTo('home')}>Yoga Organization of Japan</button>\n          <button\n            type=\"button\"\n            className={`menu-toggle ${mobileMenuOpen ? 'is-open' : ''}`}\n            aria-expanded={mobileMenuOpen}\n            aria-label=\"メニューを開く\"\n            onClick={() => setMobileMenuOpen((open) => !open)}\n          >\n            <span />\n            <span />\n            <span />\n          </button>\n        </div>\n        <div className=\"topbar-actions\">\n          <button className=\"primary-button header-main-button\" onClick={() => moveTo('diagnosis')}>生徒向け診断</button>\n          <nav className={`nav-row nav-secondary-menu ${mobileMenuOpen ? 'is-open' : ''}`}>\n            <button onClick={() => moveTo('search')}>検索・一覧</button>\n            <button onClick={() => moveTo('pro-yoga')}>プロYoga検定</button>\n          </nav>\n        </div>\n      </header>\n"""
if old_header not in app_text:
    raise SystemExit('header block not found')
app_text = app_text.replace(old_header, new_header)
app.write_text(app_text)

css_text = css.read_text()
append = """

/* --- mobile header menu refinement --- */
.topbar-brand-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-main-button {
  min-width: 160px;
  min-height: 46px;
}

.nav-secondary-menu {
  display: flex;
  align-items: center;
  gap: 10px;
}

.menu-toggle {
  display: none;
  width: 46px;
  height: 46px;
  padding: 0;
  border: 1px solid rgba(108,138,118,.16);
  border-radius: 14px;
  background: #ffffff;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-direction: column;
  box-shadow: 0 10px 20px rgba(16,37,66,.05);
}

.menu-toggle span {
  width: 18px;
  height: 2px;
  border-radius: 999px;
  background: var(--navy);
  transition: transform .18s ease, opacity .18s ease;
}

.menu-toggle.is-open span:nth-child(1) {
  transform: translateY(6px) rotate(45deg);
}

.menu-toggle.is-open span:nth-child(2) {
  opacity: 0;
}

.menu-toggle.is-open span:nth-child(3) {
  transform: translateY(-6px) rotate(-45deg);
}

@media (min-width: 769px) {
  .topbar {
    align-items: center;
  }

  .topbar-brand-row {
    width: auto;
    flex: 0 0 auto;
  }

  .topbar-actions {
    flex: 1;
    justify-content: flex-end;
  }
}

@media (max-width: 768px) {
  .topbar {
    display: grid;
    gap: 14px;
    align-items: start;
  }

  .topbar-actions {
    display: grid;
    gap: 10px;
    width: 100%;
  }

  .header-main-button {
    width: 100%;
    justify-content: center;
  }

  .menu-toggle {
    display: inline-flex;
  }

  .nav-secondary-menu {
    display: none;
    width: 100%;
  }

  .nav-secondary-menu.is-open {
    display: grid;
    gap: 10px;
  }

  .nav-secondary-menu button {
    width: 100%;
    text-align: left;
    border-radius: 16px;
    padding: 14px 16px;
  }
}
"""
if '/* --- mobile header menu refinement --- */' not in css_text:
    css_text += append

css.write_text(css_text)
print('Updated mobile header markup and CSS.')
