const Registration = (function () {
    // This function sends a register request to the server
    // * `username`  - The username for the sign-in
    // * `avatar`    - The avatar of the user
    // * `name`      - The name of the user
    // * `password`  - The password of the user
    // * `onSuccess` - This is a callback function to be called when the
    //                 request is successful in this form `onSuccess()`
    // * `onError`   - This is a callback function to be called when the
    //                 request fails in this form `onError(error)`
    const register = function (username, avatar, name, password, onSuccess, onError) {

        //
        // A. Preparing the user data
        //
        const jsonData = JSON.stringify({ username, avatar, name, password });
        //
        // B. Sending the AJAX request to the server
        //
        fetch("/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: jsonData
        })
            .then((res) => res.json())
            //
            // J. Handling the success response from the server
            //
            .then((json) => {
                if (json.status == "success" && onSuccess) {
                    console.log('succs');
                    onSuccess();
                }
                else if (onError) onError(json.error);
            })
            //
            // F. Processing any error returned by the server
            //
            .catch((err) => { if (onError) onError(err); });
    };

    return { register };
})();
