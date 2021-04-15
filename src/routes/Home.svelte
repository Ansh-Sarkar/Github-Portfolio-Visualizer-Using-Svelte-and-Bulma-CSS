<script>
  import GithubIcon from "../components/GithubIcon.svelte";
  let username;

  const handleKeyPress = (event) => {
    if (event.keyCode == 13) {
      if (username) {
        window.location.href += "#/users/" + username;
      }
    }
  };
</script>

<div class="initial">
  <div class="search">
    <a href="https://github.com/Ansh-Sarkar" target="_blank">
      <GithubIcon />
    </a>
    <h2 class="title pt-2">Search Github by Username</h2>
    <input
      bind:value={username}
      type="text"
      class="input"
      on:keyup={handleKeyPress}
    />
  </div>
  <nav
    class="navbar mt-5"
    role="navigation"
    aria-label="main navigation"
    style="border-radius: 10px;"
  >
    <div id="navbarBasicExample" class="navbar-menu">
      <div class="navbar-start">
        <a class="navbar-item" href="https://bulma.io/"> Powered By : </a>

        <div class="navbar-brand">
          <a class="navbar-item" href="https://bulma.io">
            <img
              src="https://bulma.io/images/bulma-logo.png"
              width="112"
              height="28"
              alt="logo"
            />
          </a>

          <a
            role="button"
            href="https://bulma.io/"
            class="navbar-burger"
            aria-label="menu"
            aria-expanded="false"
            data-target="navbarBasicExample"
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </a>
        </div>

        <div class="navbar-end">
          <div class="navbar-item">
            <div class="buttons">
              <a class="button is-light" href="https://bulma.io/">
                Documentation
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="navbar-end">
        <div class="navbar-item">
          <div class="buttons">
            <a
              href="https://github.com/Ansh-Sarkar"
              class="button is-primary"
              target="_blank"
            >
              <strong>Github</strong>
            </a>
            <a
              href="https://www.linkedin.com/in/ansh-sarkar/"
              class="button is-primary"
              target="_blank"
            >
              <strong>LinkedIn</strong>
            </a>
          </div>
        </div>
      </div>
    </div>
  </nav>
</div>

<style>
  .initial {
    background: #6a3093; /* fallback for old browsers */
    background: -webkit-linear-gradient(
      to right,
      #a044ff,
      #6a3093
    ); /* Chrome 10-25, Safari 5.1-6 */
    background: linear-gradient(
      to right,
      #a044ff,
      #6a3093
    ); /* W3C, IE 10+/ Edge, Firefox 16+, Chrome 26+, Opera 12+, Safari 7+ */
    height: 100vh;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
  }

  .initial .search {
    display: flex;
    flex-direction: column;
    text-align: center;
    align-items: center;
    justify-content: center;
    width: 300px;
  }

  .title {
    color: whitesmoke;
  }
</style>
