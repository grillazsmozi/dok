let admins;
        let staff;
    
        async function getAuths() {
            const response = await fetch("/api/auths");
            const auths = await response.json();
    
            admins = auths.admins;
            staff = auths.staff;
    
            initAuth(); // Initialize the authentication check only after auths are loaded
        }
    
        function initAuth() {
            const levels = ["IPKkjs01xo", "532GKYWFMZ"];
            let adminElements = document.getElementsByClassName("admin");
    
            let adminLevel = window.sessionStorage.getItem("adminlevel");
    
            if (!adminLevel) {
                let prompt1 = prompt("Kérjük jelentkezzen be!");
                if (admins.includes(prompt1)) {
                    console.log("Creating admin key");
                    window.sessionStorage.setItem("adminlevel", "IPKkjs01xo");
                    console.log("Created admin key");
                } else if (staff.includes(prompt1)) {
                    console.log("Creating staff key");
                    window.sessionStorage.setItem("adminlevel", "532GKYWFMZ");
                    console.log("Created staff key");
                } else {
                    console.log("Nem vagy jogosult a belépéshez!");
                    alert("Nem vagy jogosult a belépéshez!");
                    window.location.reload();
                }
            } else if (!levels.includes(adminLevel)) {
                alert("Error: Authentication error! (E405)");
                window.sessionStorage.removeItem("adminlevel");
                window.location.reload();
            }
        }
    
        function logout() {
            window.sessionStorage.removeItem("adminlevel");
            window.location.reload();
        }
    
        // Call getAuths to start the fetch and initialization
        getAuths();