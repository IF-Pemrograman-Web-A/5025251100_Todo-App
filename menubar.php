<aside class="sidebar-panel" role="complementary" aria-labelledby="nav-heading">
    <h2 id="nav-heading">Navigasi</h2>
    <ul class="nav-menu">
        <li>
            <a href="index.php?tab=personal" class="nav-item <?= $currentTab === 'personal' ? 'active' : '' ?>">
                Tugas Personal
            </a>
        </li>
        <li>
            <a href="index.php?tab=shared" class="nav-item <?= $currentTab === 'shared' ? 'active' : '' ?>">
                Tugas Shared (Organisasi)
            </a>
        </li>
    </ul>
</aside>