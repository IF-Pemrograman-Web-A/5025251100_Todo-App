<aside class="sidebar-panel" role="complementary" aria-labelledby="nav-heading">
    <h2 id="nav-heading">Navigasi</h2>
    <ul class="nav-menu">
        <li>
            <a href="index.php?tab=personal" class="nav-item <?= (!isset($_GET['tab']) || $_GET['tab'] == 'personal') ? 'active' : '' ?>">
                Personal Tugas
            </a>
        </li>
        <li>
            <a href="index.php?tab=shared" class="nav-item <?= (isset($_GET['tab']) && $_GET['tab'] == 'shared') ? 'active' : '' ?>">
                Shared Tugas (Organisasi)
            </a>
        </li>
    </ul>
</aside>