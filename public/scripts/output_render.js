document.addEventListener('DOMContentLoaded', async () => {
            
            const urlParams = new URLSearchParams(window.location.search);
            const itemId = urlParams.get('id');
            const hasPhoto = urlParams.get('has_photo'); 

            const idElement = document.getElementById('id_name');
            const nameElement = document.getElementById('item_name');
            const descElement = document.getElementById('item_desc');
            const imgElement = document.getElementById('item_img');

            if (!itemId) {
                idElement.textContent = 'N/A';
                nameElement.textContent = 'Error: Resource ID not specified in the address bar (URL).';
                nameElement.classList.add('error-message');
                descElement.textContent = 'Please navigate to this page via the search form.';
                imgElement.src = 'https://via.placeholder.com/450x300.png?text=Error:+No+ID';
                return; 
            }

            try {
                const response = await fetch(`/inventory/${itemId}`);

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error(`Resource with ID ${itemId} not found in the database.`);
                    } else {
                        throw new Error(`A server-side error occurred: Status ${response.status}`);
                    }
                }

                const itemData = await response.json();

                idElement.classList.remove('loading');
                nameElement.classList.remove('loading');
                descElement.classList.remove('loading');

                idElement.textContent = itemData.id;
                nameElement.textContent = itemData.name;
                
                let finalDescription = itemData.description && itemData.description.trim() !== '' 
                    ? itemData.description 
                    : 'There is no description for this resource.';

                if (hasPhoto === 'true' && itemData.photoPath) {
                    const photoUrl = `${window.location.origin}/inventory/${itemData.id}/photo`;
                    finalDescription += ` (Photo: ${photoUrl})`;
                }

                descElement.textContent = finalDescription;

                if (itemData.photoPath) {
                    imgElement.src = `/inventory/${itemData.id}/photo`;
                } else {
                    imgElement.src = 'https://via.placeholder.com/450x300.png?text=No+Photo+Available';
                }

            } catch (error) {
                console.error('Error executing fetch request:', error);
                
                idElement.textContent = itemId;
                nameElement.textContent = 'Data loading error';
                nameElement.classList.add('error-message');
                descElement.textContent = error.message;
                imgElement.src = 'https://via.placeholder.com/450x300.png?text=Fetch+Error';
            }
        });