<script>
  export let params = {};
  import { getAllRepos, getUser, getUserStats } from "../utils/github_utils.js";
  import Profile from "../components/Profile.svelte";
  import TopRepos from "../components/TopRepos.svelte";
  import { pop } from "svelte-spa-router";
  const username = params.username;
  let res = getUserStats(username);
</script>

<main>
  <div class="bg" />
  <button on:click={pop} class="back-button button is-primary"> Back </button>
  {#await res}
    <div class="loading">
      <progress class="progress is-small is-primary" max="100" />
    </div>
  {:then { user, repos, headers }}
    <div class="limits has-text-light has-text-weight-bold subtitle">
      {headers["x-ratelimit-remaining"]} / {headers["x-ratelimit-limit"]}
      <br />
      <span class="small">Requests Left</span>
    </div>
    <Profile {user} />
    <TopRepos {repos} />
  {/await}
</main>

<style>
  .bg {
    z-index: -9999;
    position: fixed;
    height: 600px;
    width: 100%;
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
    top: 0;
    right: 0;
  }
  .limits {
    position: absolute;
    left: 20px;
    top: 70px;
    text-align: center;
  }
  .limits .small {
    font-size: 12px;
  }
  .back-button {
    position: absolute;
    top: 25px;
    left: 25px;
  }
  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100%;
    background-color: whitesmoke;
  }
  .loading progress {
    width: 200px;
  }
</style>
